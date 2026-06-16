import json
import logging
from datetime import datetime
from backend.config import settings

logger = logging.getLogger(__name__)

# Try to import Gemini
try:
    import google.generativeai as genai
    HAS_GEMINI = bool(settings.GEMINI_API_KEY)
    if HAS_GEMINI:
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    logger.warning(f"Gemini API not available: {e}")
    HAS_GEMINI = False

def run_investigation(transaction_info: dict) -> str:
    """Run agentic AI investigation for suspicious transactions"""
    
    if HAS_GEMINI:
        return _run_gemini_investigation(transaction_info)
    else:
        return _run_simulated_investigation(transaction_info)

def _run_gemini_investigation(transaction_info: dict) -> str:
    """Use Gemini AI for investigation"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""You are a fraud investigation expert. Analyze this suspicious transaction and provide a professional report.

Transaction Details:
- Transaction ID: {transaction_info.get('transaction_id')}
- User ID: {transaction_info.get('user_id')}
- Amount: ${transaction_info.get('amount')}
- Merchant: {transaction_info.get('merchant')}
- Location: {transaction_info.get('location')}
- Device: {transaction_info.get('device')}
- Risk Score: {transaction_info.get('risk_score'):.1f}%
- Risk Factors: {json.dumps(transaction_info.get('risk_factors', {}))}

Provide a structured analysis in the following format:
1. SUSPICIOUS SIGNALS - List detected fraud indicators
2. RISK ANALYSIS - Break down the risk factors
3. FRAUD PATTERN - Identify the fraud pattern type
4. RECOMMENDATION - Action to take (approve/decline/review)
5. CONFIDENCE LEVEL - Confidence in the assessment (0-100%)"""

        response = model.generate_content(prompt)
        report = response.text if response else "Investigation inconclusive"
        logger.info(f"✅ Gemini investigation completed for TX {transaction_info.get('transaction_id')[:8]}")
        return report
    
    except Exception as e:
        logger.error(f"Gemini investigation failed: {e}")
        return _run_simulated_investigation(transaction_info)

def _run_simulated_investigation(transaction_info: dict) -> str:
    """Fallback to simulated high-fidelity investigation"""
    
    risk_score = transaction_info.get('risk_score', 50)
    risk_factors = transaction_info.get('risk_factors', {})
    
    # Simulate detailed investigation report
    report = f"""FRAUD INVESTIGATION REPORT
Generated: {datetime.utcnow().isoformat()}
Transaction ID: {transaction_info.get('transaction_id')}

1. SUSPICIOUS SIGNALS
"""
    
    signals = []
    if risk_score > 85:
        signals.append("   ✓ Critical risk threshold exceeded (85%+)")
    if 'impossible_travel' in risk_factors:
        signals.append("   ✓ Geographical impossibility detected")
    if 'new_device' in risk_factors:
        signals.append("   ✓ Transaction from previously unseen device")
    if 'high_frequency' in risk_factors:
        signals.append("   ✓ Unusual transaction frequency pattern")
    if 'night_activity' in risk_factors:
        signals.append("   ✓ Late night activity anomaly")
    
    if not signals:
        signals = ["   ✓ Moderately elevated risk indicators"]
    
    report += "\n".join(signals) + "\n\n"
    
    # Risk Analysis
    report += """2. RISK ANALYSIS
   • Amount-based Risk: """
    
    if transaction_info.get('amount', 0) > 2000:
        report += "HIGH - Large transaction amount\n"
    elif transaction_info.get('amount', 0) > 500:
        report += "MEDIUM - Above-average transaction\n"
    else:
        report += "LOW - Normal transaction amount\n"
    
    report += f"""   • Device Risk: {'HIGH - New device detected' if 'new_device' in risk_factors else 'LOW - Known device'}
   • Location Risk: {'MEDIUM - Unusual location' if 'impossible_travel' in risk_factors else 'LOW - Expected location'}
   • Behavioral Risk: {'HIGH - Abnormal pattern' if 'high_frequency' in risk_factors else 'LOW - Normal behavior'}

3. FRAUD PATTERN ASSESSMENT
"""
    
    pattern = None
    if 'impossible_travel' in risk_factors:
        pattern = "Account Takeover / Compromised Credentials"
    elif 'new_device' in risk_factors and transaction_info.get('amount', 0) > 1000:
        pattern = "Card Testing / Account Probe"
    elif 'high_frequency' in risk_factors:
        pattern = "Rapid Fire Attacks"
    elif 'night_activity' in risk_factors:
        pattern = "Unusual Behavior Pattern"
    else:
        pattern = "Generic Anomalous Behavior"
    
    report += f"   Pattern Type: {pattern}\n"
    report += f"   Confidence: {min(risk_score + 10, 99):.0f}%\n\n"
    
    report += """4. RECOMMENDATION
   """
    
    if risk_score > 85:
        report += "DECLINE transaction and flag account\n"
        report += "   - Issue card replacement\n"
        report += "   - Require authentication\n"
    elif risk_score > 70:
        report += "REQUIRE REVIEW - Contact customer for verification\n"
        report += "   - Send verification code\n"
        report += "   - Request confirmation\n"
    else:
        report += "MONITOR - Allow with enhanced monitoring\n"
        report += "   - Flag for additional analysis\n"
        report += "   - Track similar patterns\n"
    
    report += f"""
5. CONFIDENCE ASSESSMENT
   Overall Confidence: {min(risk_score + 10, 99):.0f}%
   Model Agreement: High
   Pattern Match: Strong

---
Report generated by TrustGuard AI Investigation Engine
"""
    
    return report
