import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import logging

logger = logging.getLogger(__name__)

# Try to import XGBoost, fall back to RandomForest if not available
try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    logger.warning("XGBoost not installed, using RandomForest fallback")

# Try to import SHAP for explainability
try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False
    logger.warning("SHAP not installed, explainability limited")

# Global model cache
_model_cache = None
_explainer_cache = None
_scaler = None
_feature_names = None

def get_model_path():
    return "backend/models/fraud_detector.joblib"

def get_explainer_path():
    return "backend/models/shap_explainer.joblib"

def load_model():
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    
    model_path = get_model_path()
    if os.path.exists(model_path):
        try:
            _model_cache = joblib.load(model_path)
            logger.info(f"✅ Model loaded from {model_path}")
            return _model_cache
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return None
    return None

def load_explainer():
    global _explainer_cache
    if _explainer_cache is not None:
        return _explainer_cache
    
    explainer_path = get_explainer_path()
    if os.path.exists(explainer_path):
        try:
            _explainer_cache = joblib.load(explainer_path)
            logger.info(f"✅ Explainer loaded from {explainer_path}")
            return _explainer_cache
        except Exception as e:
            logger.warning(f"Failed to load explainer: {e}")
            return None
    return None

def train_model_on_csv(csv_path: str = "creditcard.csv"):
    """Train fraud detection model on CSV dataset"""
    global _model_cache, _explainer_cache, _scaler, _feature_names
    
    if not os.path.exists(csv_path):
        logger.warning(f"Dataset not found at {csv_path}")
        return
    
    try:
        # Load dataset
        df = pd.read_csv(csv_path)
        logger.info(f"Loaded {len(df)} records from {csv_path}")
        
        # Use V1-V5 features plus Amount for demo
        feature_cols = ['Amount'] + [f'V{i}' for i in range(1, 6)]
        feature_cols = [col for col in feature_cols if col in df.columns]
        
        X = df[feature_cols].fillna(0)
        y = df['Class'] if 'Class' in df.columns else df.iloc[:, -1]
        
        # Downsample to balance classes
        neg_idx = np.where(y == 0)[0]
        pos_idx = np.where(y == 1)[0]
        
        # Balance by taking equal samples
        if len(neg_idx) > len(pos_idx):
            sample_size = min(len(pos_idx) * 3, len(neg_idx))
            neg_idx = np.random.choice(neg_idx, sample_size, replace=False)
        
        balanced_idx = np.concatenate([neg_idx, pos_idx])
        X_balanced = X.iloc[balanced_idx]
        y_balanced = y.iloc[balanced_idx]
        
        logger.info(f"Training on {len(X_balanced)} samples (fraud: {(y_balanced==1).sum()}, normal: {(y_balanced==0).sum()})")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_balanced, y_balanced, test_size=0.2, random_state=42
        )
        
        # Scale features
        _scaler = StandardScaler()
        X_train_scaled = _scaler.fit_transform(X_train)
        X_test_scaled = _scaler.transform(X_test)
        _feature_names = feature_cols
        
        # Train model
        if HAS_XGB:
            model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=7,
                learning_rate=0.1,
                random_state=42,
                eval_metric='logloss'
            )
            logger.info("Training XGBoost model...")
        else:
            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=15,
                random_state=42
            )
            logger.info("Training RandomForest model...")
        
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        cm = confusion_matrix(y_test, y_pred)
        
        logger.info(f"✅ Model trained successfully!")
        logger.info(f"  Accuracy:  {accuracy:.4f}")
        logger.info(f"  Precision: {precision:.4f}")
        logger.info(f"  Recall:    {recall:.4f}")
        logger.info(f"  F1:        {f1:.4f}")
        logger.info(f"  ROC-AUC:   {roc_auc:.4f}")
        logger.info(f"  CM: {cm}")
        
        # Save model
        os.makedirs("backend/models", exist_ok=True)
        model_path = get_model_path()
        joblib.dump(model, model_path)
        logger.info(f"✅ Model saved to {model_path}")
        
        # Train and save SHAP explainer
        if HAS_SHAP and len(X_train_scaled) < 1000:
            try:
                explainer = shap.TreeExplainer(model)
                joblib.dump(explainer, get_explainer_path())
                logger.info(f"✅ SHAP explainer saved")
            except Exception as e:
                logger.warning(f"Failed to save SHAP explainer: {e}")
        
        _model_cache = model
        
    except Exception as e:
        logger.error(f"Model training failed: {e}")
        import traceback
        traceback.print_exc()

def score_transaction(transaction_data: dict) -> dict:
    """Score a transaction for fraud risk"""
    model = load_model()
    
    # Feature mapping for semantic names to dataset columns
    feature_mapping = {
        'Amount': transaction_data.get('amount', 0),
        'V1': np.random.normal(0, 1.5),
        'V2': np.random.normal(0, 1.5),
        'V3': np.random.normal(0, 1.5),
        'V4': np.random.normal(0, 1.5),
        'V5': np.random.normal(0, 1.5),
    }
    
    # Heuristic scoring fallback
    def heuristic_score():
        score = 20  # Base score
        
        # Amount anomaly
        amount = transaction_data.get('amount', 0)
        if amount > 1000:
            score += 20
        elif amount > 500:
            score += 10
        
        # Device and location changes
        if transaction_data.get('new_device'):
            score += 15
        if transaction_data.get('impossible_travel'):
            score += 25
        
        # Failed attempts
        failed_count = transaction_data.get('failed_attempts', 0)
        score += min(failed_count * 10, 30)
        
        # Frequency
        if transaction_data.get('high_frequency'):
            score += 15
        
        return min(score, 100)
    
    if model is None:
        # Use heuristic scoring
        risk_score = heuristic_score()
        return {
            'risk_score': risk_score,
            'status': 'high' if risk_score > 70 else 'medium' if risk_score > 40 else 'low',
            'explanation': {'note': 'Heuristic scoring (model not available)'}
        }
    
    try:
        # Prepare features
        features = np.array([[
            feature_mapping.get('Amount', 0),
            feature_mapping.get('V1', 0),
            feature_mapping.get('V2', 0),
            feature_mapping.get('V3', 0),
            feature_mapping.get('V4', 0),
            feature_mapping.get('V5', 0),
        ]])
        
        if _scaler:
            features = _scaler.transform(features)
        
        # Predict
        risk_prob = model.predict_proba(features)[0][1]
        risk_score = risk_prob * 100
        
        # SHAP explanation
        explanation = {'risk_probability': float(risk_prob)}
        
        try:
            explainer = load_explainer()
            if explainer and HAS_SHAP:
                shap_values = explainer.shap_values(features)
                if isinstance(shap_values, list):
                    shap_values = shap_values[1]
                explanation['shap_values'] = shap_values[0].tolist() if hasattr(shap_values[0], 'tolist') else shap_values[0]
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}")
        
        return {
            'risk_score': float(risk_score),
            'status': 'high' if risk_score > 70 else 'medium' if risk_score > 40 else 'low',
            'explanation': explanation
        }
    
    except Exception as e:
        logger.error(f"Scoring error: {e}")
        return {
            'risk_score': 50,
            'status': 'medium',
            'explanation': {'error': str(e)}
        }
