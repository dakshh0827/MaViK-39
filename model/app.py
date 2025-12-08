# app.py
from flask import Flask, request, jsonify
#from flask_cors import CORS
import pickle
import numpy as np
from datetime import datetime

app = Flask(__name__)
#CORS(app)

# Load model
try:
    with open('predictive_maintenance_model.pkl', 'rb') as f:
        model = pickle.load(f)
    print("✓ Model loaded successfully!")
except FileNotFoundError:
    print("Model file not found. Run save_model.py first!")
    model = None

# Feature validation
FEATURES = ['Machine_ID','Hourly_Usage','Temperature_C', 'Vibration_mms', 'Energy_Consumption_W', 
            'Days_Since_Weekly_Maintenance','Maintenance_Type']

FEATURE_RANGES = {
    'Temperature_C': (50, 100),
    'Vibration_mms': (0, 15),
    'Energy_Consumption_W': (200, 600),
    'Days_Since_Weekly_Maintenance': (0, 7)
}


@app.route('/predict', methods=['POST'])
def predict():
    
    if model is None:
        return jsonify({
            'error': 'Model not loaded. Run save_model.py first.',
            'status': 'error'
        }), 503
    
    try:
        # Get JSON data
        data = request.get_json()
        
        if data is None:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Extract features
        features_dict = {
            'Machine_ID': data.get('Machine_ID'),
            'Hourly_Usage': data.get('Hourly_Usage'),
            'Temperature_C': data.get('Temperature_C'),
            'Vibration_mms': data.get('Vibration_mms'),
            'Energy_Consumption_W': data.get('Energy_Consumption_W'),
            'Days_Since_Weekly_Maintenance': data.get('Days_Since_Weekly_Maintenance'),
            'Maintenance_Type': data.get('Maintenance_Type')
        }
        
        
        # Create feature array
        X = np.array([[
            features_dict['Machine_ID'],
            features_dict['Hourly_Usage'],
            features_dict['Temperature_C'],
            features_dict['Vibration_mms'],
            features_dict['Energy_Consumption_W'],
            features_dict['Days_Since_Weekly_Maintenance'],
            features_dict['Maintenance_Type']
        ]])
        
        # Make prediction
        prediction = model.predict(X)
        prob_1 = float(model.predict_proba(X)[0][1])
        
        # Return response
        return jsonify({
            'prediction': int(prediction),
            'probability_percentage': prob_1,
            'status': 'success'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Error: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    model_status = 'ready' if model is not None else 'not_loaded'
    return jsonify({
        'status': 'healthy',
        'model': model_status,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 200


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("   POST http://localhost:1240/predict")
    print("   GET  http://localhost:1240/health\n")
    print("Press CTRL+C to stop\n")
    
    app.run(
        host='0.0.0.0',
        port=1240,
        debug=True
    )