import io
import os
import uuid
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from utils.logger import logger

class ReportService:
    """
    Generates professional, publication-quality medical analysis reports in PDF format using ReportLab.
    """
    def __init__(self, output_dir="reports"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        self.version = "1.0.0"

    def generate_pdf(self, analysis_data: dict, user_data: dict, image_bytes: bytes = None) -> str:
        """
        Generates a structured PDF report and returns the local file path.
        """
        analysis_id = analysis_data.get("id") or str(uuid.uuid4())
        filename = f"report_{analysis_id}.pdf"
        filepath = os.path.join(self.output_dir, filename)

        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        primary_color = colors.HexColor("#0f172a") # Dark Slate
        accent_color = colors.HexColor("#0284c7")  # Medical Teal/Blue
        muted_color = colors.HexColor("#64748b")
        warning_bg = colors.HexColor("#fef3c7")
        warning_border = colors.HexColor("#f59e0b")

        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=primary_color,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=muted_color
        )
        
        h2_style = ParagraphStyle(
            'SectionH2',
            parent=styles['Heading2'],
            fontSize=12,
            leading=16,
            textColor=accent_color,
            fontName='Helvetica-Bold',
            spaceBefore=10,
            spaceAfter=6
        )
        
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155")
        )
        
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#92400e")
        )

        elements = []

        # --- Header ---
        header_data = [
            [
                Paragraph("<b>NEUROSCAN AI</b><br/><font size=8 color='#0284c7'>RESEARCH & EDUCATIONAL PLATFORM</font>", title_style),
                Paragraph(f"<b>Report ID:</b> {analysis_id[:8]}...<br/><b>Generated:</b> {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}<br/><b>Version:</b> {self.version}", subtitle_style)
            ]
        ]
        header_table = Table(header_data, colWidths=[3.5*inch, 3.5*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=12))

        # --- Patient & Analysis Meta ---
        first_name = user_data.get('first_name', 'Research')
        last_name = user_data.get('last_name', 'Subject')
        email = user_data.get('email', 'N/A')

        meta_data = [
            [
                Paragraph("<b>Patient / Subject Info</b>", h2_style),
                Paragraph("<b>Analysis Metadata</b>", h2_style)
            ],
            [
                Paragraph(f"<b>Name:</b> {first_name} {last_name}<br/><b>Email:</b> {email}", body_style),
                Paragraph(f"<b>Model:</b> {analysis_data.get('model_name', 'BrainTumorClassifier')}<br/><b>Model Version:</b> {analysis_data.get('model_version', '1.0.0')}<br/><b>Preprocess Ver:</b> {analysis_data.get('preprocessing_version', '1.0.0')}", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[3.5*inch, 3.5*inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('PADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'TOP')
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # --- AI Classification Result ---
        pred_class = analysis_data.get('prediction', 'Unknown')
        confidence = analysis_data.get('confidence', 0.0)
        probs = analysis_data.get('probabilities', {})

        elements.append(Paragraph("AI Classification Results", h2_style))

        prob_table_data = [
            ["Predicted Category", f"{pred_class.upper()}"],
            ["Model Confidence", f"{confidence * 100:.1f}% (Classifier Output Confidence)"],
            ["Glioma Probability", f"{probs.get('Glioma', 0) * 100:.1f}%"],
            ["Meningioma Probability", f"{probs.get('Meningioma', 0) * 100:.1f}%"],
            ["Pituitary Probability", f"{probs.get('Pituitary', 0) * 100:.1f}%"],
            ["None / No Tumor Probability", f"{probs.get('None', 0) * 100:.1f}%"]
        ]

        prob_table = Table(prob_table_data, colWidths=[3.0*inch, 4.0*inch])
        prob_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor("#1e293b")),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('PADDING', (0,0), (-1,-1), 5),
            ('FONTSIZE', (0,0), (-1,-1), 8.5),
        ]))
        elements.append(prob_table)
        elements.append(Spacer(1, 14))

        # --- Educational Explanation ---
        explanation = analysis_data.get('explanation', {})
        summary = explanation.get('summary', 'Classification analysis complete.')
        edu_info = explanation.get('educational_explanation', 'No additional details available.')
        limitations = explanation.get('limitations', 'AI models are probabilistic tools.')
        next_steps = explanation.get('general_next_steps', ['Consult with a licensed medical professional.'])

        elements.append(Paragraph("Structured Educational Explanation", h2_style))
        elements.append(Paragraph(f"<b>Summary:</b> {summary}", body_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(f"<b>Overview:</b> {edu_info}", body_style))
        elements.append(Spacer(1, 6))

        # Next Steps
        steps_text = "<br/>".join([f"• {step}" for step in next_steps])
        elements.append(Paragraph(f"<b>Recommended General Follow-up Steps:</b><br/>{steps_text}", body_style))
        elements.append(Spacer(1, 14))

        # --- Mandatory Disclaimer Box ---
        disclaimer_data = [[
            Paragraph("<b>CRITICAL MEDICAL & RESEARCH DISCLAIMER:</b><br/>"
                      "This report is generated strictly by an automated AI image classification model for educational and research use. "
                      "It does <b>NOT</b> constitute a medical diagnosis, clinical staging, tumor grading, or medical prescription. "
                      "Model confidence does NOT equate to medical certainty. Clinical decisions must always be made by a certified physician or radiologist.", disclaimer_style)
        ]]
        disc_table = Table(disclaimer_data, colWidths=[7.0*inch])
        disc_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), warning_bg),
            ('BOX', (0,0), (-1,-1), 1, warning_border),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        elements.append(disc_table)

        doc.build(elements)
        logger.info(f"Generated PDF report at: {filepath}")
        return filepath
