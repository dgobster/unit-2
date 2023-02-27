//declare map var in global scope
var map;
var minValue;
//function to instantiate the Leaflet map
function createMap() {
    //create the map
    map = L.map('map', {
        center: [43.075193, -89.423867
        ],
        zoom: 8
    });

    //add OSM base tilelayer
    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 20,
        opacity: .5,
        attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    //call getData function
    getData(map);
    getBoundaryData(map);
};

function calculateMinValue(json) {
    //create empty array to store all data values
    var allValues = [];
    //loop through each county
    for (var county of json.features) {
        //loop through each year
        for (var year = 15; year <= 21; year += 1) {
            //get food share population rate for current year
            var value = county.properties["fsharerate" + String(year)];
            //add value to array
            allValues.push(value);
        }
    }
    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue / minValue, 0.5715) * minRadius

    return radius;
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes) {
    //Assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];
    //check
    console.log(attribute);

    //create marker options
    var geojsonMarkerOptions = {
        fillColor: "#66aa99",
        color: "#446666",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    geojsonMarkerOptions.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, geojsonMarkerOptions);

    //build popup content string starting with county...Example 2.1 line 24
    var popupContent = "<p><b>County:</b> " + feature.properties.County + "</p>";

    //add formatted attribute to popup content string
    var year = 15;
    popupContent += "<p><b>Food Share Population Rate in 20" + year + ":</b> " + feature.properties[attribute] + " %</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent);

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(json, attributes) {

    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(json, {
        pointToLayer: function (feature, latlng) {
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//Build an attributes array from the data
function processData(data) {
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties) {
        //only take attributes with population values
        if (attribute.indexOf("fsharerate") > -1) {
            attributes.push(attribute);
        };
    };


    return attributes;
};

//Create new sequence controls
function createSequenceControls(attributes) {
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend', slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    //Add step buttons
    document.querySelector('#panel').insertAdjacentHTML('beforeend', '<button class="step" id="reverse"></button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend', '<button class="step" id="forward"></button>');

    //Replace button content with images
    document.querySelector('#reverse').insertAdjacentHTML('beforeend', "<img src='img/noun-reverse.png'>")
    document.querySelector('#forward').insertAdjacentHTML('beforeend', "<img src='img/noun-forward.png'>")

    //Click listener for buttons
    document.querySelectorAll('.step').forEach(function (step) {
        step.addEventListener("click", function () {
            var index = document.querySelector('.range-slider').value;

            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 6 : index;
            };

            //Update slider
            document.querySelector('.range-slider').value = index;

            updatePropSymbols(attributes[index]);
        })
    })

    //Input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function () {
        //sequence
    });

    //Input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function () {
        var index = this.value
        updatePropSymbols(attributes[index]);
    });
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
           //access feature properties
           var props = layer.feature.properties;

           //update each feature's radius based on new attribute values
           var radius = calcPropRadius(props[attribute]);
           layer.setRadius(radius);

           //add county to popup content string
           var popupContent = "<p><b>County:</b> " + props.County + "</p>";

           //add formatted attribute to panel content string
           var year = attribute.split("rate")[1];
           popupContent += "<p><b>Food Share Population Rate 20" + year + ":</b> " + props[attribute] + " %</p>";

           //update popup content            
           popup = layer.getPopup();            
           popup.setContent(popupContent).update();
        };
    });
};


//function to retrieve the data and place it on the map
function getData(map) {
    //load the data
    fetch("data/foodShare.geojson")
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            //calculate minimum data value
            var attributes = processData(json);
            minValue = calculateMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        });
};

//function to retrieve the data and place it on the map
function getBoundaryData(map) {
    //load the data
    fetch("data/countyBound.json")
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            //create and style a Leaflet GeoJSON layer and add it to the map
            L.geoJson(json, {
                weight: 2,
                color: '#92a4af',
                fillOpacity: 0,
                interactive: false,
            }).addTo(map);
        })
};

document.addEventListener('DOMContentLoaded', createMap)