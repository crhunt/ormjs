var orm; // Defined here
var metamodel; // Defined in parse-orm
var svg; // Defined in svg constructor
var trigger = false;

// ------ Download --------

function download_png(event) {

    // Set download name
    d3.select("#downloadPngButton").attr("download", () => {
        return download_name( d3.select("#downloadPngButton").attr("download"), ".png" );
    });
    
    // Add styling to svg
    add_style_data();

    // Firefox bug: set SVG size
    var cnvsw = document.getElementById('canvas').offsetWidth;
    var cnvsh = document.getElementById('canvas').offsetHeight;
    var r = cnvsh / cnvsw;
    var setw = 3000;
    var seth = setw*r;
    var svgw = svg.attr("width");
    var svgh = svg.attr("height");
    svg
        .attr("width", setw)
        .attr("height", seth);

    // Create a canvas. We copy the svg content here.
    var canvas = document.getElementById('hidden_canvas');
    canvas.setAttribute("width", setw);
    canvas.setAttribute("height", seth);

    // Convert SVG to XML
    var ctx = canvas.getContext('2d');
    var rawSvg = new XMLSerializer().serializeToString(d3.select("#canvas svg" ).node());
    var DOMURL = window.URL || window.webkitURL || window;

    // Create URL for image
    var img = new Image();
    //var svgBlob = new Blob([rawSvg], {type: 'image/svg+xml;charset=utf-8'});
    var svgBlob = new Blob([rawSvg], {type: 'image/svg+xml;base64'});
    var url = DOMURL.createObjectURL(svgBlob);
    //var url = "data:image/svg+xml;base64," + utoa( rawSvg );
    img.src = url; // Set canvas to svg


    img.onload = function () {
        ctx.drawImage(img, 0, 0); // This is actually where we draw the svg to the canvas
        DOMURL.revokeObjectURL(url); // Now we're done using the URL
    
        if (trigger) {
            var imgURI = canvas
                .toDataURL('image/png')
                .replace('image/png', 'image/octet-stream');
        
            d3.select("#downloadPngButton").attr('href', imgURI);
            triggerDownload("downloadPngButton");
        } else {
            d3.select("#downloadPngButton").attr('href', null);
        }
    }

    // Remove styling from svg
    remove_style_data();

    svg
        .attr("width", svgw)
        .attr("height", svgh);
    
    trigger ? trigger = false : trigger = true;
}

function triggerDownload (idname) {
    var evt = new MouseEvent('click', {
      view: window,
      bubbles: false,
      cancelable: true
    });
  
    document.getElementById(idname).dispatchEvent(evt);
}

function download_svg() {

    /*
       Execute on click of download button.

       Prepare SVG for download includes 2 important data modifications:
       1. All object data is converted to a json string for recovery if the
          file is uploaded to ORMJS.
       2. Styles associated with the elements are added as inline styles. So
          the SVG displays correctly outside the ORMJS environment.
     */

    // Set download name
    d3.select("#downloadSvgButton").attr("download", () => {
        return download_name( d3.select("#downloadSvgButton").attr("download"), ".svg" );
    });

    // Close popups
    remove_all_popups(() => console.log('Popups removed.'))
    // Datum to json string
    jsonify_data();
    // Add styling to svg
    add_style_data();
    // Get SVG
    var svgid = svg.attr("id");
    var rawSvg = new XMLSerializer().serializeToString(d3.select(`#${svgid}`).node());
    d3.select("#downloadSvgButton").attr('href', "data:image/svg+xml;base64," + utoa( rawSvg ));

    // Remove styling from svg
    remove_style_data();
}

function utoa(data) {
    return btoa(unescape(encodeURIComponent(data)));
}

function download_name(df,suff) {
    if(!(d3.select("#uploadname").html()  === "")) {
        return d3.select("#uploadname").html().split(".")[0] + suff;
    }
    return df;
}

function jsonify_data() {
    /*
      Convert all datums into json strings. 
      Add as a string value to the attribute "json".
     */
    for ( var objID in orm.views ) {
        orm.views[objID].d3object.attr("json",
            JSON.stringify( orm.views[objID].d3object.datum() 
        ));
    }
    for ( var objID in orm.entities ) {
        //orm.entities[entityID].attr("json",JSON.stringify( orm.entities[entityID].datum() ));
        orm.entities[objID].d3object.attr("json",
            JSON.stringify( orm.entities[objID].d3object.datum() 
        ));
    }
    for ( var objID in orm.values ) {
        //orm.values[valueID].attr("json",JSON.stringify( orm.values[valueID].datum() ));
        orm.values[objID].d3object.attr("json",
            JSON.stringify( orm.values[objID].d3object.datum() 
        ));
    }
    for ( var objID in orm.connectors ) {
        orm.connectors[objID].d3object.attr("json",
            JSON.stringify( orm.connectors[objID].d3object.datum() 
        ));
    }
    for ( var objID in orm.roleboxes ) {
        //orm.roleboxes[rbID].attr("json",JSON.stringify( orm.roleboxes[rbID].datum() ));
        orm.roleboxes[objID].d3object.attr("json",
            JSON.stringify( orm.roleboxes[objID].d3object.datum() 
        ));
    }
    for ( objID in orm.rbgroups ) {
        //orm.rbgroups[rbID].attr("json",JSON.stringify( orm.rbgroups[rbID].datum() ));
        orm.rbgroups[objID].d3object.attr("json",
            JSON.stringify( orm.rbgroups[objID].d3object.datum() 
        ));
    }
    for ( var objID in orm.constraints ) {
        orm.constraints[objID].d3object.attr("json",
            JSON.stringify( orm.constraints[objID].d3object.datum() 
        ));
    }
}

function add_style_data() {

    /*
      For every id on the canvas, get it's style data and add to the element.

      This step is required for SVGs to display with ORMJS styling outside
      the ORMJS environment.
     */
    var svgid = svg.attr("id");
    var idlist = document.getElementById(svgid).querySelectorAll('[id]');
    var support = supported_style_list();
    for (var dv in idlist ) {
        if ( idlist[dv].id ) {
            d3.select("#"+idlist[dv].id).attr("style", () => dumpCSSText(idlist[dv].id, support) );
            if ( idlist[dv].id.includes("r-id-entity") ) { add_style_attrs(idlist[dv].id); }
            if ( idlist[dv].id.includes("r-id-value") ) { add_style_attrs(idlist[dv].id); }
            if ( idlist[dv].id.includes("c-id-constraint") ) { add_style_attrs(idlist[dv].id); }
            //add_style_attrs( idlist[dv].id );
        }
    }
}

function supported_style_list() {
    /* 
      Style elements important for exporting SVG with CSS

      Don't want to load all styles for the element because the file size blows up.

        We want to set this with document.styleSheets[1].cssRules but doesn't work in
        browser without a server host because of CORS violations (that aren't there... because
        it's same origin... but Firefox is dumb.) Can't access with XMLHttpRequest because
        then FF realizes it's same origin. Catch 22. So here's a stupid list.
     */
    return ['filter','fill','cursor','opacity','stroke','stroke-width', 'stroke-dasharray',
            'height','width','rx','ry','r','font-family','font-size','paint-order','color', 
            'dominant-baseline','text-anchor']
}

function dumpCSSText(anyID, support = []){
    /* 
      Get a string of styles associated with the element that are taken from
      the stylesheet orm-style.css.
     */

    var elem = document.getElementById(anyID);
    var o = window.getComputedStyle(elem); // Includes CSS set by stylesheet
    var s = '';
    if ( support.length > 0 ) {
        for(var i in o) {
            if ( support.includes(o[i]) ) { s+=o[i] + ':' + o.getPropertyValue(o[i])+';'; }
        }
    } else {
        for(var i in o) {
            s+=o[i] + ':' + o.getPropertyValue(o[i])+';';
        }
    }
    return s;
}

function add_style_attrs(anyID) {

    // Need to be explicitly set as attrs for downloaded SVG appearance.

    var stylelist = ['rx','ry','fill','opacity','height','stroke-dasharray'];
    var elem = document.getElementById(anyID);
    var o = window.getComputedStyle(elem); // Includes CSS set by stylesheet

    var obj = d3.select("#"+anyID);
    for (var i in o) {
        if ( stylelist.includes(o[i]) ) {
            obj.attr(o[i], o.getPropertyValue(o[i]));
        }
    }
}

/*function loadCSSCors(stylesheet_uri) {

    // https://stackoverflow.com/questions/3211536/accessing-cross-domain-style-sheet-with-cssrules
    var _xhr = window.XMLHttpRequest;
    var has_cred = false;
    try {has_cred = _xhr && ('withCredentials' in (new _xhr()));} catch(e) {}
    if (!has_cred) {
      console.error('CORS not supported');
      return;
    }
    var xhr = new _xhr();
    xhr.open('GET', stylesheet_uri);
    xhr.onload = function() {
      xhr.onload = xhr.onerror = null;
      if (xhr.status < 200 || xhr.status >= 300) {
        console.error('style failed to load: ' + stylesheet_uri);
      } else {
        var style_tag = document.createElement('style');
        style_tag.appendChild(document.createTextNode(xhr.responseText));
        document.head.appendChild(style_tag);
      }
    };
    xhr.onerror = function() {
        xhr.onload = xhr.onerror = null;
        console.error('XHR CORS CSS fail:' + stylesheet_uri);
    };
    xhr.send();
}*/


// ------ Upload --------

function upload_svg() {

    /*
        Execute on upload of an ORMJS-generated SVG to ORMJS.

        The SVG preparation process includes 3 important steps:
        1. Inline style data is removed. This is because some of these settings
           (such as entity width) may change during interaction.
        2. Model state information is extracted from the SVG. JSON data strings
           are converted to datum for each element.
        3. Each object is populated with the ORMJS actions it can perform.
           This is necessary to interact and change the model.
     */

    var file = this.files[0];

    d3.select("#uploadname").html(file.name);

    var reader = new FileReader();
    reader.readAsText( file );

    //var data = "";
    reader.onload = function(event) { 
        // Read data
        var data = event.target.result;
        
        // To canvas
        d3.select("#canvas").html(data);
        
        // Remove inline style
        remove_style_data();
        
        // Get state from data
        initialize_globals();
        populate_state();
        populate_actions();

        // Update Rel
        parse_orm();
    }
    reader.onerror = error => console.log(error);

}

function initialize_globals() {

    // Set orm data object which tracks ORM model objects.

    orm = {
        views : {},
        entities : {},
        connectors : {},
        rbgroups : {},
        roleboxes : {},
        values : {},
        constraints : {},
        highestViewID : 0,
        highestEntityID : 0,
        highestConnID : 0,
        highestConstID : 0,
        highestRBID : 0,
        highestValueID : 0,
    };

    initialize_metamodel();
}

function populate_state() {

    /*
       Two actions are key to populating the state:
       1. Populate the datum of each object with the JSON string that was
          set at download.
       2. Set the global orm data by adding each object, keyed by its id. 
          Set the highest id number for each object type (used to add new objects).

       Note: Order is important! The various objects are populated in an order than
       prevents errors from parse_orm.
     */
    
    // SVG
    populate_orm_state("svg_prototype", "views");
    // Identify highest constraint ID
    orm.highestViewID = set_highest_ID(orm.views);

    // Connectors
    populate_orm_state("connector_prototype", "connectors");
    // Identify highest connector ID
    orm.highestConnID = set_highest_ID(orm.connectors);

    // Roleboxes
    populate_orm_state("rolebox_prototype", "roleboxes");

    // Rolebox groups
    populate_orm_state("rolebox_group", "rbgroups");
    // Identify highest rolebox group ID
    orm.highestRBID = set_highest_ID(orm.rbgroups);

    // Entities
    populate_orm_state("entity_prototype", "entities");
    // Identify highest entity ID
    orm.highestEntityID = set_highest_ID(orm.entities);

    // Values
    populate_orm_state("value_prototype", "values");
    // Identify highest entity ID
    orm.highestValueID = set_highest_ID(orm.values);

    // Constraints
    populate_orm_state("constraint_prototype", "constraints");
    // Identify highest constraint ID
    orm.highestConstID = set_highest_ID(orm.constraints);

}

function populate_orm_state(class_name, orm_object_name) {
    // Get all divs of class
    var object_divs = d3.select("#canvas").selectAll("."+class_name);
    console.log("class_name", class_name, object_divs.nodes())
    var orig_format = [];
    var new_format = ["constraint_prototype", "connector_prototype", "svg_prototype",
                "entity_prototype", "value_prototype", "rolebox_group", "rolebox_prototype"];
    if (orig_format.includes(class_name)) {
        // Iterate through nodes of class
        for ( var k in object_divs.nodes() ) { 
            // Add object to orm list
            anyID = object_divs.nodes()[k].id;
            orm[orm_object_name][anyID] = d3.select("#"+anyID);
            // Populate datum
            orm[orm_object_name][anyID].datum( JSON.parse(orm[orm_object_name][anyID].attr("json")) );
        }
    }
    if (new_format.includes(class_name)) {
        console.log("new_format")
        // Iterate through nodes of class
        for ( var k in object_divs.nodes() ) { 
            // Add object to orm list
            anyID = object_divs.nodes()[k].id;
            var d3object = d3.select("#"+anyID);
            // Populate datum
            d3object.datum( JSON.parse(d3object.attr("json")) );
            // Create object
            if( class_name == "connector_prototype") { 
                var obj = new Connector({d3object: d3object}); 
                obj.record();
            }
            if( class_name == "constraint_prototype") { 
                new Constraint({d3object: d3object}); 
            }
            if( class_name == "svg_prototype" ) {
                var obj = new View({d3object: d3object});
                // Only one SVG
                obj.set_current();
            }
            if( class_name == "entity_prototype") { 
                new Entity({d3object: d3object}); 
            }
            if( class_name == "value_prototype") { 
                new Value({d3object: d3object}); 
            }
            if( class_name == "rolebox_group") { 
                new Predicate({d3object: d3object}); 
            }
            if( class_name == "rolebox_prototype") { 
                new Rolebox({d3object: d3object}); 
            }
        }
    }
    
}

function set_highest_ID(objlist, highest=0) {
    // Count objects of type when you load a diagram from a file
    for (var anyID in objlist) {
        var numID = parseInt( object_number(anyID) );
        if ( numID >= highest ) {
            highest = numID+1;
        }
    }
    return highest
}

function object_number(anyID) {
    // anyID is for the entire object group, generated by generate_*ID
    return anyID.split("-")[2]
}

function populate_actions() {

    /*
       For every object in the model, attach the actions it can perform.
       This is crucial on upload to ensure that objects are interactive.
     */

    //svg_actions( d3.select("#canvas-svg") );
    //svg = d3.select("#canvas-svg");

    for ( var svgID in orm.views ) {
        //connector_actions( orm.connectors[connID] );
        orm.views[svgID].actions();
    }

    for ( var entityID in orm.entities ) {
        //entity_actions( orm.entities[entityID] );
        orm.entities[entityID].actions();
    }

    for ( var valueID in orm.values ) {
        //value_actions( orm.values[valueID] );
        orm.values[valueID].actions();
    }

    for ( var connID in orm.connectors ) {
        //connector_actions( orm.connectors[connID] );
        orm.connectors[connID].actions();
    }

    for ( var rbID in orm.rbgroups ) {
        //rolebox_group_actions( orm.rbgroups[rbID] );
        orm.rbgroups[rbID].actions();
    }

    for ( var rbID in orm.roleboxes ) {
        //rolebox_actions( orm.roleboxes[rbID] );
        orm.roleboxes[rbID].actions();
    }

    for ( var constID in orm.constraints ) {
        //connector_actions( orm.connectors[connID] );
        orm.constraints[constID].actions();
    }
}

function remove_style_data() {
    // For every id on the canvas, remove inline style data from the element.
    var svgid = svg.attr("id");
    var idlist = document.getElementById(svgid).querySelectorAll('[id]');
    for (var dv in idlist ) {
        if ( idlist[dv].id ) {
            d3.select("#"+idlist[dv].id).attr("style", null );
        }
    }
}