var refreshRate = 5000; // in milliseconds
var numPrinters = 0;
var printers = new Object();

// TODO
// switch to sockJS
// possibly include port field in the Add Printer modal
// edit existing saved printers
// reorder printers
// checkbox for minimizing and not updating a printer
// toolbar button for printers

window.onload = function(){
  // get saved printers
  reloadPrinters();
  // update printer info
  setInterval(function () {updatePrinters();}, refreshRate);
};

function reloadPrinters(){
  if(localStorage.getItem("savedPrinters") === null){
      printers ={
          "ip":[],
          "apikey":[]
      };
      $("#noPrintersModal").modal("show");
  }else {
      printers = JSON.parse(localStorage.getItem("savedPrinters"));
      for(var i=0;i<printers.ip.length;i++){
          addPrinter(printers.ip[i], printers.apikey[i]);
      }
  }
}

function initialInfo(ip, apikey, index){
  var removeButton = '<button type="button" class="btn btn-default btn-sm pull-right" data-toggle="modal" onclick="removePrinter('+index+')"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>';
  var octoPrintPageButton = '<a type="button" class="btn btn-default btn-sm pull-right" data-toggle="modal" href="http://'+printers.ip[index]+'/" target="_blank"><span class="glyphicon glyphicon-home" aria-hidden="true"></span></a>';

  // add apikey header to GET request
  $.ajaxSetup({headers:{"X-Api-Key" : apikey}});
  // get name of the printer
  $.getJSON("http://"+ip+"/api/printerprofiles", function(json){document.getElementById("printerName"+index).innerHTML=json.profiles._default.name+removeButton+octoPrintPageButton;});
  document.getElementById("printerIP"+index).innerHTML = ip;

  updateStatus(ip, apikey, index);
}

function updateStatus(ip, apikey, index){
  // add apikey header to GET request
  $.ajaxSetup({headers:{"X-Api-Key" : apikey}});

  // check for connection to printer
  $.getJSON("http://"+ip+"/api/version", function(json){
    if(json.api === null){
      makeBlank(index);
    }else {
      document.getElementById("panel"+index).className = "panel panel-primary";
      document.getElementById("printerIP"+index).innerHTML = ip;
    }
  })
  .error(function() {
    //document.getElementById("panel"+index).className = "panel panel-danger";
    makeBlank(index);
  });

  // get info on current print job
  $.getJSON("http://"+ip+"/api/job", function(json){
      // get printer state
      document.getElementById("printerStatus"+index).innerHTML="State: "+json.state;
      //get filename of print
      if(json.job.file.name === null){
          // set current file to no file selected
          document.getElementById("currentFile"+index).innerHTML="No file selected";
          // set time left field to no active print
          document.getElementById("timeLeft"+index).innerHTML="No active print";
          // set print progress bar perecent to 0
          $("div#progressBar"+index ).css("width", "0%");
      }else {
          // set filename of current print
          document.getElementById("currentFile"+index).innerHTML="File: "+json.job.file.name.split(".").slice(0, -1).join(".");
          // set estimation of print time left
          document.getElementById("timeLeft"+index).innerHTML="Time left: "+(json.progress.printTimeLeft/60).toFixed(2) + " minutes";
          // set percentage of print completion
          $("div#progressBar"+index).css("width", json.progress.completion + "%");
      }
  })
  .error(function() {
    document.getElementById("panel"+index).className = "panel panel-danger";
    makeBlank(index);
  });


  // get info on temps
  $.getJSON("http://"+ip+"/api/printer", function(json){
      // get temp of extruder 0 and its target temp
      document.getElementById("e0Temp"+index).innerHTML="Extruder: "+json.temperature.tool0.actual+"°/"+json.temperature.tool0.target+"°";
      // get temp of the bed and its target temp
      if(typeof json.temperature.bed!=="undefined"){
        document.getElementById("bedTemp"+index).innerHTML="Bed: "+json.temperature.bed.actual+"°/"+json.temperature.bed.target+"°";
      }else {
        document.getElementById("bedTemp"+index).innerHTML="0°";
      }
  })
  .error(function() {
    document.getElementById("panel"+index).className = "panel panel-danger";
    makeBlank(index);
  });

}

function updatePrinters(){
  for(var i=0;i<numPrinters;i++){
      updateStatus(printers.ip[i],printers.apikey[i], i);
  }
}

function addPrinter(ip, apikey){
  var printerNum = numPrinters;
  var removeButton = '<button type="button" class="btn btn-default btn-sm pull-right" data-toggle="modal" onclick="removePrinter('+printerNum+')"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>';
  var octoPrintPageButton = '<a type="button" class="btn btn-default btn-sm pull-right" data-toggle="modal" href="http://'+printers.ip[printerNum]+'/" target="_blank"><span class="glyphicon glyphicon-home" aria-hidden="true"></span></a>';

  // add HTML
  $("#printerGrid").append('<div class="col-xs-6 col-md-4" id="printer'+printerNum+'"></div>');
  $("#printer"+printerNum).append('<div class="panel panel-primary" id="panel'+printerNum+'"></div>');
  $("#panel"+printerNum).append('<div class="panel-heading" id="printerName'+printerNum+'">Printer Name'+removeButton+octoPrintPageButton+'</div>');

  $("#panel"+printerNum).append('<div class="panel-body" id="body'+printerNum+'"></div>');

  $("#body"+printerNum).append('<p id="printerStatus'+printerNum+'">status</p>');
  $("#body"+printerNum).append('<p id="e0Temp'+printerNum+'">0</p>');
  $("#body"+printerNum).append('<p id="bedTemp'+printerNum+'">0</p>');
  $("#body"+printerNum).append('<p id="currentFile'+printerNum+'">No active print</p>');
  $("#body"+printerNum).append('<p id="timeLeft'+printerNum+'">Print Time Left</p>');

  $("#body"+printerNum).append('<div class="progress" id="progress'+printerNum+'"></div>');
  $("#progress"+printerNum).append('<div class="progress-bar progress-bar-info progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"  id="progressBar'+printerNum+'"></div>');

  $("#panel"+printerNum).append('<div class="panel-footer" id="printerIP'+printerNum+'">ip</div>');

  // store ip and apikey info
  printers.ip[printerNum]=ip;
  printers.apikey[printerNum]=apikey;

  // save new printer to local storage
  localStorage.setItem("savedPrinters", JSON.stringify(printers));

  // get initial info on printer
  initialInfo(ip, apikey, printerNum);

  numPrinters++;
}

function addFromModal(){
  var newIP = $("#newIP").val();
  var newApikey = $("#newApikey").val();

  if(newIP === ""|| newApikey === ""){
      $("#missingInfoModal").modal("show");
  }else {
      checkConnection(newIP, newApikey);
      $("#newIP").val("");
      $("#newApikey").val("");
  }
}

function deletePrinters(){
	// remove the printers from localStorage
	localStorage.removeItem("savedPrinters");
	// remove the printers from the printers object
  printers ={
        "ip":[],
    	"apikey":[]
	};
	// reset the number of printers
	numPrinters = 0;
	// remove all elements within the grid
	$("#printerGrid").empty();
}

function removePrinter(index){
	var printerNum = index+1;
  bootbox.confirm("Remove printer #"+(printerNum)+"?", function(result) {
  	if(result){
			// remove the printer from the page
			document.getElementById("printer"+index).remove();

			// remove the printer from the printers object
			printers.ip.splice(index, 1);
			printers.apikey.splice(index, 1);

			// save new object to localStorage
			if(numPrinters <= 1){
				localStorage.removeItem("savedPrinters");
			}else {
				localStorage.setItem("savedPrinters", JSON.stringify(printers));
			}
			numPrinters = 0;
			$("#printerGrid").empty();
			reloadPrinters();

  	}
	});
}

function makeBlank(index){
  // make panel border color red
  document.getElementById("panel"+index).className = "panel panel-danger";
  // make the status fields blank
  document.getElementById("printerStatus"+index).innerHTML="";
  document.getElementById("e0Temp"+index).innerHTML="";
  document.getElementById("bedTemp"+index).innerHTML="";
  document.getElementById("currentFile"+index).innerHTML="";
  document.getElementById("timeLeft"+index).innerHTML="";
  // set progress bar to 100%
  $("div#progressBar"+index).css("width", "100%");
  // set panel footer to printer ip with not connected messgae
  document.getElementById("printerIP"+index).innerHTML = printers.ip[index]+" (not connected)";
}

function checkConnection(ip, apikey){
	var errorMessage = "PrinterView was unable to connect to the OctoPrint instance at "+ip+" using the following API key: "+apikey+". Remember to include the port of your OctoPrint instance in the IP Address field. Do you still want to add this printer?";
	var connected = false;

	$.ajaxSetup({headers:{"X-Api-Key" : apikey}});
	$.getJSON("http://"+ip+"/api/version", function(json){
		console.log("dbfbd");
		if(json.api !== null){
			connected = true;
		}else {
			connected = false;
		}
	})
	.error(function(){
		connected = false;
	});

	if(connected){
		addPrinter(ip, apikey);
	}else {
		bootbox.confirm(errorMessage, function(result){
			if(result){
				addPrinter(ip, apikey);
			}else {
				return 0;
			}
		});
	}
}
