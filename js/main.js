//function to instantiate the Leaflet map
function createMap(){

    var map = L.map('map').setView([20,0], 2);
    var ren = new L.geoJson();
    var fos = new L.geoJson().addTo(map);
    
    // create attribution following world bank guidelines
    fos.getAttribution = function(){return 'Fossil Fuels: Based on IEA data from IEA Statistics &copy; OECD/IEA [2014], www.iea.org/statistics, Licence: www.iea.org/t&c; as modified by Allison K Smith'; }; 
    ren.getAttribution = function(){return 'Renewable Energy: Based on IEA data from IEA World Energy Balences &copy; OECD/IEA [2013], www.iea.org/statistics, Licence: www.iea.org/t&c; as modified by Allison K Smith'; }; 
    
    getFos(map, ren, fos);
    getRen(map, ren, fos);
    

    // open street map tiles
    var osm   = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }),
 // esri tiles
        esri  = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
	       attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    }).addTo(map);

    
    //create base layers
    var baseLayers = {
        "Grayscale": esri,
        "Streets": osm
    };

    // create overlays
    var overlays = {
        "Renewable Energy": ren,
        "Fossil Fuels": fos
    };

    ren.addTo(map);
    
    // create layer control panel to switch on and off 
    L.control.layers(baseLayers, overlays, {collapsed:false}).addTo(map);
    return map;
    
};




// attach popup to each feature
function onEachFeature(feature, layer){
    //no property named popupcontentl instead create html string with all properties
    var popupContent = "";
    if (feature.properties) {
        //loop to add feature property names and values to html string
        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    }
};



//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    
    //create marker options
    if (attribute.includes("ren")){
        var options = {
            fillColor: "#31a354",
            color: "#006d2c",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        };
    } else {
        var options = {
            fillColor: "#636363",
            color: "#000",
            weight: 1,
            opacity: .7,
            fillOpacity: 0.5
        };
    }
    // for each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);
    
    //give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);
    
    //create circle marker layer
    var layer = L.circleMarker(latlng,options);
    
    //call the create popup function 
    createPopUp(feature.properties, attribute, layer, options.radius);
    
    // POPUP ON HOVEROVER
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        }
    });
    
    //return the circle marker to the L.geoJson pointtolayer option
    return layer;
};


// calculate radius of each proportional symbol
function calcPropRadius(attValue){
    //scale factor to adjust symbol size evenly
    var scaleFactor = 50;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);
    
    return radius;
};



//Add circle markers for point feature to the map
function createPropSymbolsRen(data, ren, attributes){
    
    //create a leaflet geojson layer and add it to the map
    renSize = L.geoJson(data,{
        //create a Leaflet GeoJSON layer and add it to the map
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(ren);
};

function createPropSymbolsFos(data, fos, attributes){
    
    //create a leaflet geojson layer and add it to the map
    fosSize = L.geoJson(data,{
        //create a Leaflet GeoJSON layer and add it to the map
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(fos);
    return fosSize;
};

//SEQUENCING CONTROLS
function createSequenceControls(map, ren, fos, attributes){
    var SequenceControl = L.Control.extend({
        options: {
          position: 'bottomleft'  
        },
            
    onAdd: function(map){
        // create the  container div with a particular class name
        var slider = L.DomUtil.create('div', 'range-slider-container');
        $(slider).append('<input class="range-slider" type="range" max=8 min=0 step=1 value=0>');
        
        $(slider).append('<button class="skip" id="reverse" title="Reverse">Reverse</button>');
        $(slider).append('<button class="skip" id="forward" title="Forward">Forward</button>');
        
        $(slider).on('mousedown dblclick', function(e){
            L.DomEvent.stopPropagation(e);
        });
        
        $(slider).on('mousedown', function(){
            map.dragging.disable();
        });               
        return slider;
        
    }
    });
    createTemporalLegend(map, attributes[0]);
    createLegendRen(map, attributes[0]);
    createLegendFos(map,attributes[0]);
   
    map.addControl(new SequenceControl());
    
    
    $('#reverse').html('<img src="img/left.png">');
    $('#forward').html('<img src="img/right.png">');
    //click listener for buttons
    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();
        //increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index ++;
            // if past the last attribute, wrap around to the first
            index = index > 8 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index --;
            //if past the first attribute, wrap around to the last
            index = index < 0 ? 8 : index;
        };
        //update slider
        $('.range-slider').val(index);
        updatePropSymbolsRen(renSize, map,  attributes[index]);
        updatePropSymbolsFos(fosSize, map, attributes[index]);
    });
    $('.range-slider').on('input', function(){
        //get the new index value
        var index = $(this).val();
        updatePropSymbolsRen(renSize, map,  attributes[index]);
        updatePropSymbolsFos(fosSize, map, attributes[index]);
    });

};



function createTemporalLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options:{
            position: 'topleft'
        },
        
        onAdd: function (map) {
            // create the control container with a particular class name
            var timestamp = L.DomUtil.create('div', 'timestamp-container');
            $(timestamp).append('<div id="timestamp-container">');
            return timestamp;
        }
    }); 
    map.addControl(new LegendControl());
    updateLegend(map, attributes);    
};

function createLegendRen(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        
        onAdd: function(map){
            var container = L.DomUtil.create('div', 'legend-control-container');
            var svg = '<svg id="attribute-legend" width="200" height="100">';
            var circlesR = {
                maxR: 20, 
                meanR: 40, 
                minR: 60
            };
            for (var circle in circlesR){   
                svg += svg += '<circle class="legend-circle" id="' + circle + '" fill="#31a354" fill-opacity="0.8" stroke="#006d2c" cx="40"/>';
                //text string
                svg += '<text id="' + circle + '-text" x="85" y="' + circlesR[circle] + '"></text>';
            };
            svg += "</svg>"
            $(container).append('<class="label" id="label" title="label">Renewable Energy Production</class>');
            $(container).append('<class="detail" id="detail" title="detail">(%of total)</class>');
            $(container).append(svg);
            return container;
        }
    });
    map.addControl (new LegendControl);
    updateLegendRen(map, attributes);
};

function createLegendFos(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function(map){
            var container = L.DomUtil.create('div', 'legend-control-container');
            var svg = '<svg id="attribute-legend" width="200px" height="110">';
            var circlesF = {
                maxF: 20, 
                meanF: 47.5, 
                minF: 75
            };
            for (var circle in circlesF){    
                svg += svg += '<circle class="legend-circle" id="' + circle + '" fill="#636363" fill-opacity="0.5" stroke="#000000" cx="40"/>';  
                //text string
                svg += '<text id="' + circle + '-text" x="85" y="' + circlesF[circle] + '"></text>';
            };
            svg += "</svg>"
            $(container).append('<class="label" id="label" title="label">Fossil Fuel Energy Consumption</class>');
            $(container).append('<class="detail" id="detail" title="detail">(%of total)</class>');
            $(container).append(svg);
            return container;
        }
    });
    map.addControl (new LegendControl);
    updateLegendFos(map, attributes.replace("ren", "ff"));
};

function updateLegend(map, attribute){
    var year = attribute.split("_")[2];
    var content = "Year: " + year;
    $(".timestamp-container").text(content);
};

function updateLegendRen(map,attributes){
    var circleValuesRen = getCircleValuesRen(renSize, attributes)
    for (var key in circleValuesRen){
        // get the radius
        var radius = calcPropRadius(circleValuesRen[key]);
        //assign the cy and r attributes
        $('#'+key).attr({
            cy: 60 - radius,
            r: radius
        });
        // add legend text
        $('#'+key+'-text').text(Math.round(circleValuesRen[key]*100)/100 + "%");
    };
};

function updateLegendFos(map,attributes){
    var circleValuesFos = getCircleValuesFos(fosSize, attributes)
    for (var key in circleValuesFos){
        // get the radius
        var radius = calcPropRadius(circleValuesFos[key]);
        //assign the cy and r attributes
        $('#'+key).attr({
            cy: 80 - radius,
            r: radius
        });
        // add legend text
        $('#'+key+'-text').text(Math.round(circleValuesFos[key]*100)/100 + "%");
    };
};

//calculate the max, mean, and min values for a given attribute
function getCircleValuesRen(map, attribute){
    var minR = Infinity,
        maxR = -Infinity;
    map.eachLayer (function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);
            
            //test for min
            if (attributeValue < minR){
                minR = attributeValue
            };
            
            //test for max
            if (attributeValue > maxR){
                maxR = attributeValue;
            };
        };
    });
    
    //set mean
    var meanR = (maxR + minR) / 2;
    
    //return values as an object
    return {
        maxR: maxR,
        minR: minR,
        meanR: meanR
    };
};

function getCircleValuesFos(map, attribute){
    
    var minF = Infinity,
        maxF = -Infinity;
    
    map.eachLayer (function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);
            
            //test for min
            if (attributeValue < minF){
                minF = attributeValue
            };
            
            //test for max
            if (attributeValue > maxF){
                maxF = attributeValue;
            };
        };
    });
    
    //set mean
    var meanF = (maxF + minF) / 2;
    
    //return values as an object
    return {
        maxF: maxF,
        minF: minF,
        meanF: meanF
    };
};


//function to buid an attribute array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("perc_") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};

//function to retrieve the renewable energy data and place it on the map
function getFos(map, ren, fos){
    //load the data
    $.ajax("data/percentFosFuels.geojson", {
        dataType: "json",
        success: function(response){
            //create an attributes array
            var attributes = processData(response);
            
            //call function to create proportional symbol and create slider
            createPropSymbolsFos(response, fos, attributes);
            //createSequenceControls(map, fos, ren, attributes);
        }
    });
};
function getRen(map, ren, fos){
    $.ajax("data/percentRenewableEnergy.geojson", {
        dataType: "json",
        success: function(response){
            //create an attributes array
            var attributes = processData(response);
            
            //call function to create proportional symbol and create slider
            createPropSymbolsRen(response, ren, attributes);
            createSequenceControls(map, ren, fos, attributes);
        }
    });
    
};


function updatePropSymbolsRen(renSize, map, attribute){
    
    renSize.eachLayer(function(layer){
        
        if (layer.feature && layer.feature.properties[attribute]){
            //access the features properties
            var prop = layer.feature.properties;
            
            //update each feature's radius based on new attribute values
            var rad = calcPropRadius(prop[attribute]);
            layer.setRadius(rad);
            
            //call the create popup function 
            createPopUp(prop, attribute, layer, rad);
            updateLegendRen(map, attribute);
            $(".timestamp-container").text("Year: " + attribute.split("_")[2]);
        }
    });
};

function updatePropSymbolsFos(fosSize, map, attribute){
    fosSize.eachLayer(function(layer){
        //since the attribute the function is importing is for renewable energy, replace the "ren" with "ff" to change it to the fossil fuels data
        var attributeFos = attribute.replace("ren", "ff");
        if (layer.feature && layer.feature.properties[attributeFos]){
            //access the features properties
            var props = layer.feature.properties;
            
            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attributeFos]);
            layer.setRadius(radius);
            
            //call the create popups function 
            createPopUp(props, attributeFos, layer, radius);
            updateLegendFos(map, attributeFos);
        }
    });
    
};

//function to create popup content 
function createPopUp(properties, attribute, layer, radius){
    //create popup content variable and add country name to it
    var popupContent = " ";
    // get the year by slitting the field name at the "_" character and taking the 3rd item
    var year = attribute.split("_")[2];
    // if the attribute includes ren it is renewable energy and should be labeled as such
    // if the attribute includes ff it is fossil fuels 
    if (attribute.includes("ren")){
        popupContent +=  "<p style='font-size:16px'> <b> " + properties.Country + "</b> | " + Math.round(properties[attribute]*100)/100+ "% </p>" + "<p style='font-size:11px'>of energy produced was from <br><b>Renewable Sources</b> in " + year + ". </p>"
    } else if (attribute.includes("ff")){
        popupContent += "<p style='font-size:16px'> <b> " + properties.Country + "</b> | "  + Math.round(properties[attribute]*100)/100+ "% </p>" + "<p style='font-size:11px'>of energy consumed was from <br><b>Fossil Fuels</b> in " + year + ". </p>"
    }
    //bind the popup to the layer and offset from the radius of the circle
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-radius)
    });
};


$(document).ready(createMap);