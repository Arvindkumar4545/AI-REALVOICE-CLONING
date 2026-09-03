from typing import Dict, Any, List

class FraudCopilotEngine:
    """
    Real-time multilingual conversational fraud intent engine.
    Analyzes English, Hindi, Hinglish keywords and semantic intent vectors.
    """
    def __init__(self):
        self.threat_keywords = {
            "urgency": ["urgent", "immediately", "jaldi", "turant", "now", "fatafat"],
            "authority": ["police", "officer", "manager", "cbi", "rbi", "customs", "arrest"],
            "financial": ["otp", "cvv", "password", "bank account", "freeze", "block", "transfer", "paise", "khata", "pin"],
        }
    
    def analyze_intent(self, text: str) -> Dict[str, Any]:
        if not text:
            return {
                "risk_index": 0,
                "storyline_nodes": [],
                "contributing_factors": []
            }
            
        text_lower = text.lower()
        risk_index = 0
        nodes = []
        factors = []
        
        # Simple keyword matching for demonstration
        if any(kw in text_lower for kw in self.threat_keywords["authority"]):
            risk_index += 18
            nodes.append("Authority Claim")
            factors.append("+18 Authority impersonation detected")
            
        if any(kw in text_lower for kw in self.threat_keywords["urgency"]):
            risk_index += 15
            nodes.append("Urgency")
            factors.append("+15 High urgency language")
            
        if any(kw in text_lower for kw in self.threat_keywords["financial"]):
            risk_index += 20
            nodes.append("Financial Request")
            factors.append("+20 OTP/Financial threat request")

        return {
            "risk_index": min(risk_index, 100),
            "storyline_nodes": nodes,
            "contributing_factors": factors
        }

def analyze_conversation(text: str) -> Dict[str, Any]:
    engine = FraudCopilotEngine()
    return engine.analyze_intent(text)
