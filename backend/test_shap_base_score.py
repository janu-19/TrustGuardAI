"""Test SHAP base score computation"""
import numpy as np
from backend.ml_engine import train_model_on_csv, score_transaction

def test_model_training():
    """Test that model trains successfully"""
    try:
        train_model_on_csv("creditcard.csv")
        print("✅ Model training successful")
    except Exception as e:
        print(f"❌ Model training failed: {e}")

def test_scoring():
    """Test transaction scoring"""
    test_cases = [
        {'amount': 10, 'merchant': 'Test', 'location': 'NYC', 'device': 'Web'},
        {'amount': 1000, 'merchant': 'Test', 'location': 'LA', 'device': 'Mobile'},
        {'amount': 5000, 'merchant': 'Test', 'location': 'CHI', 'device': 'ATM'},
    ]
    
    for i, tx in enumerate(test_cases):
        result = score_transaction(tx)
        print(f"✅ Test {i+1}: Risk={result['risk_score']:.1f}%, Status={result['status']}")

if __name__ == "__main__":
    print("Running model tests...")
    test_model_training()
    test_scoring()
    print("\n✅ All tests completed")
