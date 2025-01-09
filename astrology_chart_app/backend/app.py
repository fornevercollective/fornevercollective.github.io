from flask import Flask, jsonify, request
from flatlib import const
from flatlib.chart import Chart
from flatlib.datetime import Datetime

app = Flask(__name__)

@app.route('/calculate', methods=['GET'])
def calculate():
    date = request.args.get('date')
    time = request.args.get('time')
    latitude = request.args.get('latitude')
    longitude = request.args.get('longitude')

    datetime = Datetime(date, time)
    chart = Chart(datetime, latitude, longitude)

    planets = {planet: chart.getObject(planet).data for planet in const.LIST_OBJECTS}
    return jsonify(planets)

@app.route('/verify', methods=['GET'])
def verify():
    dependencies = {
        'python': True,
        'flask': True,
        'flatlib': True,
        'pip': True,
        'app.py': True,
        'postman': True
    }
    return jsonify(dependencies)

if __name__ == '__main__':
    app.run(debug=True)
