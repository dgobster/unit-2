//declare global variables
var map;
var dataStats = {};

//function to instantiate the Leaflet map
function createMap() {
    //create the map
    map = L.map('map', {
        center: [43.416993, -89.948362
        ],
        zoom: 8
    });

    //add OSM base tilelayer
    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 20,
        opacity: .65,
        attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    //call getData function
    getData(map);
    getBoundaryData(map);
};

function calcStats(json) {
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
    //get min, max, mean stats for our array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    //calculate meanValue
    var sum = allValues.reduce(function (a, b) { return a + b; });
    dataStats.mean = sum / allValues.length;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 14;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue / dataStats.min, 0.5715) * minRadius
    return radius;
};

//PopupContent constructor function
function PopupContent(properties, attribute) {
    this.properties = properties;
    this.attribute = attribute;
    this.year = attribute.split("rate")[1];
    this.population = this.properties[attribute];
    this.formatted = "<p><b>County:</b> " + this.properties.County + "</p><p><b>Food Share Population Rate in 20" + this.year + ":</b> " + this.population + " %</p>";
};


//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes) {
    //Assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];

    //create marker options
    var geojsonMarkerOptions = {
        fillColor: "#66aa99",
        color: "#446666",
        weight: 1,
        opacity: 1,
        fillOpacity: .3,
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    geojsonMarkerOptions.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, geojsonMarkerOptions);

    //create new popup content
    var popupContent = new PopupContent(feature.properties, attribute);

    //bind the popup to the circle marker    
    layer.bindPopup(popupContent.formatted, {
        offset: new L.Point(0, -geojsonMarkerOptions.radius)
    });

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

//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute) {
    var year = attribute.split("rate")[1];
    //update temporal legend
    document.querySelector("span.year").innerHTML = year;

    map.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //Example 1.3 line 6...in UpdatePropSymbols()
            var popupContent = new PopupContent(props, attribute);

            //update popup with new content    
            popup = layer.getPopup();
            popup.setContent(popupContent.formatted).update();
        };
    });
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
    var SequenceControl = L.Control.extend({
        geojsonMarkerOptions: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

            //add skip buttons
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/noun-reverse.png"></button>');
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/noun-forward.png"></button>');

            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    map.addControl(new SequenceControl());    // add listeners after adding control}

    //set slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    //Click listener for buttons
    document.querySelectorAll('.step').forEach(function (step) {
        step.addEventListener("click", function () {
            var index = document.querySelector('.range-slider').value;

            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward') {
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;
            } else if (step.id == 'reverse') {
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


function createLegend(attributes) {
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //PUT YOUR SCRIPT TO CREATE THE TEMPORAL LEGEND HERE
            container.innerHTML = '<p class="temporalLegend">Food Share Population Rate: 20<span class="year">15</span></p>';

            //Start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="160px" height="60px">';

            //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //Loop to add each circle and text to svg string
            for (var i = 0; i < circles.length; i++) {

                //Assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);
                var cy = 59 - radius;

                //circle string
                svg += '<circle class="legend-circle" id="' +
                    circles[i] +
                    '" r="' +
                    radius +
                    '"cy="' +
                    cy +
                    '" fill= "#6A9DA7" fill-opacity= "0.44" stroke= "#52757B" cx="30" />';

                //evenly space out labels            
                var textY = i * 20 + 20;

                //text string            
                svg += '<text id="' + circles[i] + '-text" x="65" y="' + textY + '">' + Math.round(dataStats[circles[i]] * 100) / 100 + " %" + '</text>';

            };

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            container.insertAdjacentHTML('beforeend', svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
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
            calcStats(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
            createLegend(attributes);
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