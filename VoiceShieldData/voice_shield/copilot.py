"""
VoiceShield Multilingual Real-Time Fraud Copilot & Intent Engine (Features 7, 8, 9, 10)
Analyzes conversational speech transcripts in real-time to detect social engineering attack chains.
Supports: English, Hindi, and Hinglish.

Detects Fraud Indicators:
- Urgency / Coercion
- Financial & Wire Transfer Demands
- OTP / PIN / Credential Harvesting
- KYC / Account Suspension Claims
- Authority Impersonation (Police, RBI, CBI, Customs, Bank Manager)
- Remote-Access Software Demands (AnyDesk, TeamViewer, RustDesk)

Builds Interactive Scam Storyline Attack Chains.
"""
from __future__ import annotations

import re
from typing import List, Dict, Any, Tuple


FRAUD_INTENT_RULES = [
    {
        "intent": "AUTHORITY_IMPERSONATION",
        "weight": 25,
        "label": "Authority Claim",
        "description": "Caller claims official identity (Police, CBI, RBI, Telecom, Customs)",
        "patterns": [
            r"\b(police|cbi|rbi|customs|cyber\s*cell|enforcement\s*directorate|ed|court|judge|officer|narcotics)\b",
            r"\b(thana|crime\s*branch|dcp|sp|inspector|adhikari|prashasan)\b",
            r"\b(bank\s*manager|head\s*office|security\s*department)\b",
        ],
    },
    {
        "intent": "KYC_ACCOUNT_THREAT",
        "weight": 20,
        "label": "Account Threat / KYC",
        "description": "Threatens immediate account freezing, SIM deactivation, or KYC expiry",
        "patterns": [
            r"\b(kyc\s*(expire|update|block|pending|deactivat)|account\s*(suspend|freez|block|close))\b",
            r"\b(sim\s*(block|deactivat)|aadhaar\s*(link|updat|block))\b",
            r"\b(aapka\s*kyc|khata\s*band|sim\s*band|aadhaar\s*link\s*karo|account\s*freeze)\b",
        ],
    },
    {
        "intent": "URGENCY_COERCION",
        "weight": 18,
        "label": "Urgency & Fear",
        "description": "Creates false urgency or threatens immediate legal consequences",
        "patterns": [
            r"\b(immediately|urgent|within\s*\d+\s*(minutes|hours)|right\s*now|last\s*chance|arrest\s*warrant)\b",
            r"\b(turant|abhi\s*karein|warna|police\s*aayegi|jail\s*hogi|jaldi\s*bataiye)\b",
            r"\b(do\s*not\s*disconnect|call\s*disconnect\s*mat\s*karna)\b",
        ],
    },
    {
        "intent": "OTP_CREDENTIAL_DEMAND",
        "weight": 30,
        "label": "OTP / Credential Demand",
        "description": "Demands one-time password, PIN, password, or security digits",
        "patterns": [
            r"\b(otp|one\s*time\s*password|pin|cvv|password|passcode|secret\s*code)\b",
            r"\b(digit\s*code|sms\s*code|message\s*ka\s*code|otp\s*(batao|bataiye|share|send))\b",
            r"\b(chaar\s*digit|chhe\s*digit|4\s*digit|6\s*digit)\b",
        ],
    },
    {
        "intent": "FINANCIAL_TRANSFER_DEMAND",
        "weight": 25,
        "label": "Financial Transfer Request",
        "description": "Requests funds transfer, refundable deposit, or penalty payment",
        "patterns": [
            r"\b(transfer|payment|deposit|refund|pay\s*fine|security\s*deposit|penalty)\b",
            r"\b(paise\s*bhejo|transfer\s*karo|rupaye|upi|google\s*pay|phonepe|paytm)\b",
            r"\b(account\s*me\s*daalo|challan\s*bharo)\b",
        ],
    },
    {
        "intent": "REMOTE_ACCESS_DEMAND",
        "weight": 28,
        "label": "Remote Access Request",
        "description": "Instructs installation of remote desktop tools (AnyDesk, TeamViewer)",
        "patterns": [
            r"\b(anydesk|teamviewer|rustdesk|quicksupport|screen\s*share|apk\s*file)\b",
            r"\b(app\s*download\s*karo|screen\s*dikhao|remote\s*access)\b",
        ],
    },
]


class FraudCopilotEngine:
    """
    Analyzes conversation segments in real-time, extracts fraud signals,
    computes cumulative fraud risk, and builds the Scam Storyline graph.
    """
    def __init__(self):
        self.compiled_rules = []
        for r in FRAUD_INTENT_RULES:
            compiled_patterns = [re.compile(p, re.IGNORECASE) for p in r["patterns"]]
            self.compiled_rules.append({**r, "compiled": compiled_patterns})

    def analyze_conversation(
        self,
        transcript_segments: List[str] | str,
        base_ai_risk: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Takes raw conversation transcript or segment list, identifies matched fraud intents,
        and constructs storyline graph nodes and actionable security recommendations.
        """
        if isinstance(transcript_segments, str):
            segments = [s.strip() for s in transcript_segments.split("\n") if s.strip()]
        else:
            segments = [s.strip() for s in transcript_segments if s.strip()]

        full_text = " ".join(segments)

        detected_intents: List[Dict[str, Any]] = []
        storyline_nodes: List[Dict[str, Any]] = [{"id": "node_caller", "label": "INBOUND CALLER", "status": "active"}]
        added_intent_keys = set()

        fraud_risk_delta = 0

        for rule in self.compiled_rules:
            matched_terms = []
            for pattern in rule["compiled"]:
                matches = pattern.findall(full_text)
                if matches:
                    for m in matches:
                        matched_terms.append(m if isinstance(m, str) else m[0])

            if matched_terms:
                unique_terms = list(set(matched_terms))[:3]
                intent_key = rule["intent"]
                if intent_key not in added_intent_keys:
                    added_intent_keys.add(intent_key)
                    fraud_risk_delta += rule["weight"]
                    detected_intents.append({
                        "intent": intent_key,
                        "label": rule["label"],
                        "description": rule["description"],
                        "matched_phrases": unique_terms,
                        "risk_contribution": rule["weight"],
                    })
                    storyline_nodes.append({
                        "id": f"node_{intent_key.lower()}",
                        "label": rule["label"],
                        "intent": intent_key,
                        "severity": "CRITICAL" if rule["weight"] >= 25 else "HIGH",
                        "status": "triggered",
                    })

        # Calculate final combined Fraud Risk Score (0 - 100)
        # Combines acoustic AI voice signal + conversational intent scoring
        combined_risk = float(np.clip(base_ai_risk * 0.40 + fraud_risk_delta * 0.60, 0.0, 100.0))

        if combined_risk >= 80.0:
            storyline_nodes.append({"id": "node_verdict", "label": "CRITICAL FRAUD PATTERN", "status": "danger"})
        elif combined_risk >= 50.0:
            storyline_nodes.append({"id": "node_verdict", "label": "HIGH-RISK ATTACK CHAIN", "status": "warning"})

        # Actionable Warnings & Recommendations
        recommendations = []
        if "OTP_CREDENTIAL_DEMAND" in added_intent_keys:
            recommendations.append("DO NOT share OTP, PIN, or banking passwords under any circumstances.")
        if "FINANCIAL_TRANSFER_DEMAND" in added_intent_keys:
            recommendations.append("DO NOT transfer funds to verify account or avoid arrest.")
        if "REMOTE_ACCESS_DEMAND" in added_intent_keys:
            recommendations.append("DO NOT install remote-access software (AnyDesk, TeamViewer).")
        if "AUTHORITY_IMPERSONATION" in added_intent_keys:
            recommendations.append("Hang up immediately and independently call official government/bank phone numbers.")

        if not recommendations:
            recommendations.append("No active social engineering indicators identified in conversation.")

        return {
            "fraud_risk_score": round(combined_risk, 1),
            "risk_tier": "CRITICAL" if combined_risk >= 80 else ("HIGH" if combined_risk >= 60 else ("SUSPICIOUS" if combined_risk >= 30 else "LOW")),
            "detected_intents": detected_intents,
            "storyline_nodes": storyline_nodes,
            "recommendations": recommendations,
            "active_warning": bool(combined_risk >= 60.0),
            "disclaimer": "Social engineering indicators detected via heuristic linguistic analysis. Does not constitute legal proof.",
        }


import numpy as np
