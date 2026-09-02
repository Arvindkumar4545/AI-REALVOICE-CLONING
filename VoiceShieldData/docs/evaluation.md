# VoiceShield Evaluation & Probability Calibration

## 1. Primary Anti-Spoofing Metrics

In voice anti-spoofing research, accuracy alone is deceptive due to severe class imbalance (~90% spoof). VoiceShield evaluates models using the following metrics:

1. **Equal Error Rate (EER)**: The operating threshold where False Acceptance Rate equals False Rejection Rate:
   $$\text{EER} = \text{FAR}(\theta) = \text{FRR}(\theta)$$
2. **False Acceptance Rate (FAR)**: Proportion of spoofed audio incorrectly classified as bona-fide human speech.
3. **False Rejection Rate (FRR)**: Proportion of genuine human speech incorrectly flagged as spoof.
4. **ROC-AUC & PR-AUC**: Area under the ROC curve and Precision-Recall curve across all decision thresholds.
5. **Balanced Accuracy**: Arithmetic mean of genuine sensitivity and spoof specificity.

---

## 2. Probability Calibration

Raw neural network sigmoid outputs often exhibit overconfident calibration errors. VoiceShield fits post-hoc calibration models on held-out validation data:

- **Platt Scaling**: Logistic regression fitted on raw logits $z$.
- **Temperature Scaling**: Optimization of scalar temperature $T > 0$:
  $$p_{\text{calib}} = \sigma\left(\frac{z}{T}\right)$$
- **Isotonic Regression**: Non-parametric piecewise constant isotonic fitting.
- **Brier Score Evaluation**: Mean squared difference between predicted probabilities and ground truth:
  $$\text{BS} = \frac{1}{N} \sum_{i=1}^N (p_i - y_i)^2$$

Calibration logs and curves are generated in [experiments/fusion/](file:///f:/VoiceShieldData/experiments/fusion/).
