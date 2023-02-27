/* Map of GeoJSON data from MegaCities.geojson */
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
function pointToLayer(feature, latlng) {
    //Determine which attribute to visualize with proportional symbols
    var attribute = "fsharerate15";

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
    var year = attribute.split("_")[1];
    popupContent += "<p><b>FoodShare Rate in " + year + ":</b> " + feature.properties[attribute] + " %</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent);

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(json) {

    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(json, {
        pointToLayer: pointToLayer
    }).addTo(map);
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
            minValue = calculateMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json);
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
            }).addTo(map);
        })
};

document.addEventListener('DOMContentLoaded', createMap)