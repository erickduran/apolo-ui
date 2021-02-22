var running = false;
var showingResults = false;
var showingAction = false;
var showingCounter = false;
var apiUrl = 'https://api.apolo.erickduran.com';

var gWindowIntensities = [];
var gPhraseIntensities = [];

async function handleResult(training, intensities, tolerance){
	var resultObject = document.getElementById("result");
	resultObject.style.color = '#C0C0C0';
	resultObject.innerHTML = "Procesando..."

	var payload = {
		'intensities': intensities
	}

	if (!training) {
		evaluateResult(payload, tolerance);
	}
	else {
		var cookie = prompt("Ingresa tu constraseña", "");
		var result = prompt("Ingresa el resultado (1 para homogénea, 0 para no homogénea)", "");

		if (result == "1") {
			payload['result'] = 1.0;
		}
		else if (result == "0") {
			payload['result'] = 0.0;
		}
		else {
			alert('Valor inválido');
			return;
		}

		if (cookie != null) {
			payload['cookie'] = cookie;
		}
		else {
			alert('Valor inválido');
		}

		postResult(payload);
		resultObject.innerHTML = "Enviado"
	}
}

function setResult(result, tolerance) {
	var resultObject = document.getElementById("result");
	var goodPhrase = false;
	console.log("RESULT: " + result)
	if (result >= 1-tolerance/100) {
		console.log('Good!')
		goodPhrase = true;
	}
	else {
		console.log('Bad!')
	}

	if (goodPhrase) {
		resultObject.value = "1";
		resultObject.innerHTML = "HOMOGÉNEA"
		resultObject.style.color = '#2E8B57';
	}
	else {
		resultObject.value = "0";
		resultObject.innerHTML = "NO HOMOGÉNEA"
		resultObject.style.color = '#B22222';
	}
}

function setSent(success) {
	var resultObject = document.getElementById("result");
	if (success) {
		resultObject.value = "1";
		resultObject.innerHTML = "Enviado"
		resultObject.style.color = '#2E8B57';
	}
	else {
		resultObject.value = "0";
		resultObject.innerHTML = "Ocurrió un error al enviar"
		resultObject.style.color = '#B22222';
	}
}

async function evaluateResult(payload, tolerance) {
	var data = JSON.stringify(payload);
	$.ajax({
	    url: apiUrl,
	    type: 'post',
	    data: data,
	    headers: {
	    	'Content-Type': 'application/json'
	    },
	    dataType: 'json',
	    success: function (data) {
	    	setResult(data['value'], tolerance);
	    },
	    error: function (data) {
	    	setSent(false);
	    }
	});
}

async function postResult(payload) {
	var data = JSON.stringify(payload);
	$.ajax({
	    url: apiUrl + "/train",
	    type: 'post',
	    data: data,
	    headers: {
	    	'Content-Type': 'application/json'
	    },
	    dataType: 'json',
	    success: function (data) {
	    	setSent(true);
	    },
	    error: function (data) {
	    	setSent(false);
	    }
	});
}

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }
    var max = arr[0];
    var maxIndex = 0;
    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }
    return maxIndex;
}

async function startEvaluation(training, bpm, bpb, phrase, beat, tolerance) {
	gWindowIntensities = []
	gPhraseIntensities = []
	if (!showingAction) {
		var x = document.getElementById("action-container");
		if (x.style.display === "none") {
		  x.style.display = "table-cell";
		}
		showingAction = true;
	}

	if (showingResults) {
		var x = document.getElementById("result-container");
		if (x.style.display != "none") {
		  x.style.display = "none";
		}

		var graphCanvas = document.getElementById("graph");
		if (graphCanvas.style.display != "none") {
		  graphCanvas.style.display = "none";
		}

		showingResults = false;
	}

	if (!showingCounter) {
		var x = document.getElementById("counter-container");
		if (x.style.display === "none") {
		  x.style.display = "inline";
		}
		showingCounter = true;
	}

	window.location.hash = "action-container";
	var notes = [];
	var sleep = 60 / bpm;
    var counter = 0;

    var strongAudio = new Audio('audio/strong.mp3');
    var weakAudio = new Audio('audio/weak.mp3');
    
	console.log('TRAINING: ' + training);
	console.log('BPM: ' + bpm);
	console.log('BPB: ' + bpb);
	console.log('PHRASE: ' + phrase);
	console.log('TOLERANCE: ' + tolerance);

	console.log('Marcando tempo...')
	var i;
	startRecording();
	var counterObject = document.getElementById('counter');
	for (i = 0; i < phrase+bpb; i++) {
	  if (i == bpb-1) {
	  	console.log('Iniciando frase...')
	  }
	  counter += 1;

	  if (i < bpb) {
	  	counterObject.style.color = '#C0C0C0';
	  }
	  else {
	  	counterObject.style.color = '#E85C5A';
	  }

	  counterObject.innerHTML = counter;
	  if (counter == 1) {
	  	if (beat) {
	  		strongAudio.play()
	  	}
	  	else {
	  		weakAudio.play()
	  	}
	  }
	  else {
	  	weakAudio.play()
	  	if (counter == bpb) {
	  		counter = 0;
	  	}
	  }

	  notes.push(currentIntensities.length)
	  await new Promise(r => setTimeout(r, sleep*1000));
	}
	finishRecording();
	
	running = false;
	console.log('Listo!');

	var phraseIntensities = [];
    var windowIntensities = currentIntensities.slice(notes[bpb], currentIntensities.length);
    var phraseNotesPointers = notes.slice(bpb, notes.length);

    let offset = 12;
    for (var i = 0; i < phraseNotesPointers.length; i++) {
    	var initial = phraseNotesPointers[i]-notes[bpb]+offset;
    	var peaks = windowIntensities.slice(phraseNotesPointers[i]-notes[bpb]+offset, phraseNotesPointers[i]-notes[bpb]+offset+10);
    	var indexofmax = indexOfMax(peaks);
    	var maxIndex = indexofmax + phraseNotesPointers[i] - notes[bpb] + offset;
    	phraseIntensities.push(maxIndex);
	}

	showResults(windowIntensities, phraseIntensities);
	gWindowIntensities = windowIntensities;
	gPhraseIntensities = phraseIntensities;

	var values = []

	for (var i = 0; i < phraseIntensities.length; i++) {
		values.push(windowIntensities[phraseIntensities[i]])
	}

	var valuesContainer = document.getElementById('values-container');
	valuesContainer.innerHTML = buildValues(values);

	handleResult(training, values, tolerance);
}

function buildValues(values) {
	var string = '';
	for (var i = 0; i < values.length; i++) {
		string = string + values[i] + '<br>';
	}
	return string;
}

function mobileCheck() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

document.addEventListener('DOMContentLoaded', function(){
	if (mobileCheck()) {
		alert('Esta página no ha sido probada en versión móvil...');
	}
}, false);


function showGraph() {
	var button = document.getElementById("button-graph");
	if (button.style.display != "none") {
	  button.style.display = "none";
	}

	var graphCanvas = document.getElementById("graph");
	if (graphCanvas.style.display === "none") {
	  graphCanvas.style.display = "block";
	}

	var allData = []
	var dataUsed = []
	for (var i = 0; i < gWindowIntensities.length; i ++){
		allData.push({
			'x': i,
			'y': gWindowIntensities[i]
		});
	}

	for (var i = 0; i < gPhraseIntensities.length; i ++){
		dataUsed.push({
			'x': gPhraseIntensities[i],
			'y': gWindowIntensities[gPhraseIntensities[i]]
		});
	}
	var ctx = document.getElementById('graph');
	var myChart = new Chart(ctx, {
	    type: 'scatter',
	    data: {
	        datasets: [{
	            label: 'Intensidades',
	            data: allData,
	            showLine: true,
	            pointRadius: 0
	        },{
	            label: 'Valores utilizados',
	            data: dataUsed,
	            borderColor: "rgb(232, 92, 90)",
	            pointStyle: 'cross',
	            pointRadius: 10
	        }],
	        options: {}
	    }
	});
}

function showResults() {
	if (showingCounter) {
		var x = document.getElementById("counter-container");
		if (x.style.display != "none") {
		  x.style.display = "none";
		}
		showingCounter = false;
	}

	if (!showingResults) {
		var x = document.getElementById("result-container");
		if (x.style.display === "none") {
		  x.style.display = "block";
		}
		var button = document.getElementById("button-graph");
		if (button.style.display === "none") {
		  button.style.display = "inline";
		}
		showingResults = true;
	}
}

function inputBPM(object) {
	const title = 'Ingresa un tempo';
	var input = prompt(title, ['100']);
	
	if (input == null) {
		object.value = '100';
	} 
	else {
		if (isNaN(input)) {
			object.value = '100';
			alert('El valor debe ser numérico')
		}
		else {
			object.value = input;
		}

		var value = parseInt(object.value, 10);
		if (value < 50) {
			object.value = '100';
			alert('El valor debe ser mayor a 50');
		}
		else if (value > 180) {
			object.value = '100';
			alert('El valor debe ser menor a 180');
		}
	}
	object.innerHTML = 'TEMPO: ' + object.value + ' BPM';
}

function inputBPB(object) {
	const title = 'Ingresa un compás';
	var input = prompt(title, ['4']);
	var notesButton = document.getElementById('button-notes');

	if (input == null) {
		object.value = notesButton.value;
	}
	else {
		if (isNaN(input)) {
			object.value = notesButton.value;
			alert('El valor debe ser numérico')
		}
		else {
			object.value = input;
		}

		var notes = parseInt(notesButton.value, 10);
		var value = parseInt(object.value, 10);
		if (value < 1) {
			object.value = notesButton.value;
			alert('El valor debe ser mayor a 0');
		}
		else if (value > notes) {
			object.value = notesButton.value;
			alert('El valor debe ser menor al número de notas');
		}
	}
	
	object.innerHTML = 'COMPÁS: ' + object.value + ' BPB';
}

function inputNotes(object) {
	const title = 'Ingresa el número de notas a evaluar';
	var input = prompt(title, ['4']);

	if (input == null) {
		object.value = '4';
	} 
	else {
		if (isNaN(input)) {
			object.value = '4';
			alert('El valor debe ser numérico')
		}
		else {
			object.value = input;
		}

		var value = parseInt(object.value, 10);
		if (value < 2) {
			object.value = '4';
			alert('El valor debe ser mayor a 2');
		}
		else if (value > 20) {
			object.value = '4';
			alert('El valor debe ser menor a 20');
		}
	}
	
	object.innerHTML = 'NÚMERO DE NOTAS: ' + object.value;
}

function inputTolerance(object) {
	const title = 'Ingresa el porcentaje de tolerancia';
	var input = prompt(title, ['50']);

	if (input == null) {
		object.value = '50';
	} 
	else {
		if (isNaN(input)) {
			object.value = '50';
			alert('El valor debe ser numérico')
		}
		else {
			object.value = input;
		}

		var value = parseInt(object.value, 10);
		if (value < 1) {
			object.value = '50';
			alert('El valor debe ser mayor a 0');
		}
		else if (value > 100) {
			object.value = '50';
			alert('El valor debe ser menor a 100');
		}
	}
	
	object.innerHTML = 'TOLERANCIA: ' + object.value + '%';
}

function toggleTraining(object) {
	if (object.value == '0') {
		object.value = '1';
		object.innerHTML = 'ENTRENAMIENTO: ON';
	}
	else {
		object.value = '0';
		object.innerHTML = 'ENTRENAMIENTO: OFF';
	}
}

function toggleBeat(object) {
	if (object.value == '0') {
		object.value = '1';
		object.innerHTML = 'ACENTO: ON';
	}
	else {
		object.value = '0';
		object.innerHTML = 'ACENTO: OFF';
	}
}

function testAudio() {
	var audio = new Audio('audio/strong.mp3');
	audio.play();
}

function toggleTestMic(object){
	var meter = document.getElementById('meter');
	if (object.value == '0') {
		object.value = '1';
		if (meter.style.visibility === "hidden" || meter.style.visibility === "") {
			meter.style.visibility = "visible";
		}
		startMeter(true);
	}
	else {
		object.value = '0';
		if (meter.style.visibility === "visible") {
			meter.style.visibility = "hidden";
		}

	}
}

async function start(object) {
	var phrase = parseInt(document.getElementById('button-notes').value, 10);
	var bpm = parseInt(document.getElementById('button-bpm').value, 10);
	var bpb = parseInt(document.getElementById('button-bpb').value, 10);
	var training = parseInt(document.getElementById('button-training').value, 10);
	var beat = parseInt(document.getElementById('button-beat').value, 10);
	var tolerance = parseInt(document.getElementById('button-tolerance').value, 10);

	if (!meter) {
		alert('Prueba tu micrófono e intenta de nuevo...');
		return
	}

	if (training == 1) {
		training = true;
	}
	else {
		training = false;
	}

	if (beat == 1) {
		beat = true;
	}
	else {
		beat = false;
	}

	if (!running) {
		running = true;
		startEvaluation(training, bpm, bpb, phrase, beat, tolerance);
	}
	else {
		console.log('Already running!')
	}
}

$(document).ready(function(){
  $("a").on('click', function(event) {
    if (this.hash !== "") {
      event.preventDefault();
      var hash = this.hash;

      $('html, body').animate({
        scrollTop: $(hash).offset().top
      }, 800, function(){
   
      });
    }
  });
});