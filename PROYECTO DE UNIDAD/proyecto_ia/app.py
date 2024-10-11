from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def mapa():
    return render_template('mapa.html')

if __name__ == '__main__':
    app.run(debug=True)
