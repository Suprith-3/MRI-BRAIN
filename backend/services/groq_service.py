import json
from groq import Groq
from config import Config
from utils.logger import logger

class GroqService:
    def __init__(self):
        self.client = None
        if Config.GROQ_API_KEY and Config.GROQ_API_KEY != 'your-groq-api-key':
            try:
                self.client = Groq(api_key=Config.GROQ_API_KEY)
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")
        self.model = "llama3-8b-8192"

    def generate_explanation(self, prediction_data: dict) -> dict:
        """
        Generate educational explanation based on ML prediction.
        Strictly prevents diagnosis, tumor staging, or false certainty claims.
        """
        predicted_class = prediction_data.get("predicted_class", "None")
        confidence = prediction_data.get("confidence", 0.0)

        # Fallback educational database in case Groq API is not configured or fails
        fallback_explanations = {
            "Glioma": {
                "summary": f"The ML classifier categorized the uploaded MRI as Glioma with a model confidence score of {int(confidence * 100)}%.",
                "predicted_category": "Glioma",
                "confidence_statement": f"Model confidence is {int(confidence * 100)}%. This score represents algorithmic probability, not clinical medical certainty.",
                "educational_explanation": "Gliomas are primary brain tumors that originate from glial cells (such as astrocytes or oligodendrocytes) which support and protect nerve cells. They vary widely in pathology, vascularity, and growth rate.",
                "limitations": "MRI classification alone cannot determine histologic grade, genetic mutations (e.g. IDH mutation or 1p/19q codeletion), or exact clinical stage. Tissue biopsy and neuro-oncology assessment are essential.",
                "general_next_steps": [
                    "Schedule a consultation with a neurologist or neuro-oncologist for comprehensive evaluation.",
                    "Request a formal diagnostic reading by a board-certified neuroradiologist.",
                    "Retain high-resolution DICOM files for future comparative clinical imaging."
                ],
                "red_flags": [
                    "Sudden severe headache or rapid neurological changes",
                    "New-onset seizures or focal motor deficits",
                    "Persistent nausea/vomiting associated with increased intracranial pressure"
                ],
                "disclaimer": "This analysis is for educational and research purposes only. It is NOT a medical diagnosis."
            },
            "Meningioma": {
                "summary": f"The ML classifier categorized the uploaded MRI as Meningioma with a model confidence score of {int(confidence * 100)}%.",
                "predicted_category": "Meningioma",
                "confidence_statement": f"Model confidence is {int(confidence * 100)}%. This score represents algorithmic probability, not clinical medical certainty.",
                "educational_explanation": "Meningiomas arise from the meninges—the protective membranes covering the brain and spinal cord. Many meningiomas are slow-growing and extra-axial, though clinical behavior depends on location and mass effect.",
                "limitations": "Contrast enhancement patterns on standard MRI do not guarantee benign versus atypical pathology without histological examination.",
                "general_next_steps": [
                    "Consult a neurosurgical specialist for clinical correlation.",
                    "Review full multi-sequence MRI studies (T1, T2, FLAIR, and post-contrast).",
                    "Discuss potential observation or management strategies with a physician."
                ],
                "red_flags": [
                    "Progressive visual disturbances or cranial nerve deficits",
                    "Unexplained severe morning headaches",
                    "Sudden cognitive or motor weakness"
                ],
                "disclaimer": "This analysis is for educational and research purposes only. It is NOT a medical diagnosis."
            },
            "Pituitary": {
                "summary": f"The ML classifier categorized the uploaded MRI as Pituitary (sellar/parasellar region) with a model confidence score of {int(confidence * 100)}%.",
                "predicted_category": "Pituitary",
                "confidence_statement": f"Model confidence is {int(confidence * 100)}%. This score represents algorithmic probability, not clinical medical certainty.",
                "educational_explanation": "Pituitary adenomas and sellar lesions occur in the pituitary gland at the skull base. They can be secretory (affecting endocrine hormones) or non-secretory (causing optical chiasm compression).",
                "limitations": "Endocrine activity and hormonal disruption cannot be evaluated from imaging alone; serum hormone assays and formal visual field testing are required.",
                "general_next_steps": [
                    "Undergo comprehensive endocrine hormonal laboratory panels.",
                    "Complete visual field perimetry testing to assess optic chiasm compression.",
                    "Consult an endocrinologist and neurosurgeon."
                ],
                "red_flags": [
                    "Bitemporal hemianopsia (peripheral vision loss)",
                    "Sudden acute headache with visual collapse (pituitary apoplexy warning)"
                ],
                "disclaimer": "This analysis is for educational and research purposes only. It is NOT a medical diagnosis."
            },
            "None": {
                "summary": f"The ML classifier did not detect typical hallmark patterns of Glioma, Meningioma, or Pituitary tumors (Confidence: {int(confidence * 100)}%).",
                "predicted_category": "None / No Tumor Detected",
                "confidence_statement": f"Model confidence is {int(confidence * 100)}%. This represents the model's classification output.",
                "educational_explanation": "No distinctive major mass lesions matching the trained tumor categories were flagged in this single slice image.",
                "limitations": "A non-detection result on an AI model does not rule out neurological conditions, non-neoplastic pathologies, microscopic lesions, or areas outside the field of view.",
                "general_next_steps": [
                    "If experiencing neurological symptoms, consult a qualified healthcare provider regardless of automated screening.",
                    "Ensure full volumetric multi-planar MRI examinations are evaluated by a radiologist."
                ],
                "red_flags": [
                    "Persistent or worsening neurological symptoms",
                    "Unexplained seizures, syncope, or speech difficulties"
                ],
                "disclaimer": "This analysis is for educational and research purposes only. It is NOT a medical diagnosis."
            }
        }

        if not self.client:
            return fallback_explanations.get(predicted_class, fallback_explanations["None"])

        system_prompt = """
        You are an educational medical-information assistant working inside an MRI image classification application.
        You are NOT a doctor and must not diagnose, prescribe medication, determine cancer stage, determine tumor grade, or claim certainty.
        The machine-learning classifier has already produced the classification.
        Your job is ONLY to explain the classifier's result using the supplied structured information.
        Never change the classifier's predicted class.
        Never invent medical findings that are not supplied.
        Never infer tumor stage or grade from the classification.
        If information is insufficient, explicitly say so.
        Provide general educational information and recommend evaluation by a qualified healthcare professional.
        Do not provide personalized medication prescriptions or dosage instructions.
        Return ONLY valid JSON matching this schema:
        {
          "summary": "...",
          "predicted_category": "...",
          "confidence_statement": "...",
          "educational_explanation": "...",
          "limitations": "...",
          "general_next_steps": ["...", "..."],
          "red_flags": ["..."],
          "disclaimer": "..."
        }
        """

        prompt = f"Explain this result: {json.dumps(prediction_data)}"

        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Error calling Groq API: {e}")
            return fallback_explanations.get(predicted_class, fallback_explanations["None"])
