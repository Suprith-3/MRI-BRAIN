import numpy as np

def calculate_metrics(y_true, y_pred, class_names=["Glioma", "Meningioma", "Pituitary", "None"]):
    """
    Computes Accuracy, Precision, Recall/Sensitivity, Specificity, F1-Score, and Confusion Matrix.
    """
    num_classes = len(class_names)
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1
        
    accuracy = np.trace(cm) / np.sum(cm)
    
    per_class_metrics = {}
    for i, name in enumerate(class_names):
        tp = cm[i, i]
        fp = np.sum(cm[:, i]) - tp
        fn = np.sum(cm[i, :]) - tp
        tn = np.sum(cm) - (tp + fp + fn)
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall_sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        f1 = (2 * precision * recall_sensitivity) / (precision + recall_sensitivity) if (precision + recall_sensitivity) > 0 else 0.0
        
        per_class_metrics[name] = {
            "precision": round(float(precision), 4),
            "sensitivity_recall": round(float(recall_sensitivity), 4),
            "specificity": round(float(specificity), 4),
            "f1_score": round(float(f1), 4),
            "support": int(np.sum(cm[i, :]))
        }
        
    return {
        "overall_accuracy": round(float(accuracy), 4),
        "confusion_matrix": cm.tolist(),
        "per_class_metrics": per_class_metrics
    }

if __name__ == "__main__":
    # Test evaluation module with mock predictions
    np.random.seed(42)
    y_true = np.random.randint(0, 4, size=100)
    y_pred = y_true.copy()
    # Add minor noise
    noise_idx = np.random.choice(100, size=8, replace=False)
    y_pred[noise_idx] = np.random.randint(0, 4, size=8)
    
    results = calculate_metrics(y_true, y_pred)
    print("Model Performance Evaluation Summary:")
    print(f"Overall Accuracy: {results['overall_accuracy'] * 100:.2f}%")
    for cls, metrics in results['per_class_metrics'].items():
        print(f"[{cls}] Precision: {metrics['precision']}, Sensitivity: {metrics['sensitivity_recall']}, F1: {metrics['f1_score']}")
