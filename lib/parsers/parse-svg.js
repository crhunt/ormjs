// Note: This requires encapsulation in a subsequent PR

var ormjs;
var png_trigger = false;

// ------ Download --------

function create_png(svgID) {

    // Add styling to svg
    add_style_data(svgID);

    // Div parent to view
    var svgparent = parent_div(svgID);
    console.log("svg parent", svgparent)
    var svg = d3.select(`#${svgID}`);
    
    // Firefox bug: set SVG size
    var cnvsw = document.getElementById(svgparent).offsetWidth;
    var cnvsh = document.getElementById(svgparent).offsetHeight;
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
    var rawSvg = new XMLSerializer().serializeToString(d3.select(`#${svgID}` ).node());
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
    
        if (png_trigger) {
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
    remove_style_data(svgID);

    svg
        .attr("width", svgw)
        .attr("height", svgh);
    
    png_trigger ? png_trigger = false : png_trigger = true;
}

function parent_div(id) {
    return d3.select( d3.select(`#${id}`).node().parentNode ).node().id;
}

function _download_png(event) {

    // Set download name
    d3.select("#downloadPngButton").attr("download", () => {
        return download_name( d3.select("#downloadPngButton").attr("download"), ".png" );
    });

    var modelID = 'id-model-0';
    var view = ormjs.models[modelID].currentview;
    create_png(view.id);
}

function triggerDownload (idname) {
    var evt = new MouseEvent('click', {
      view: window,
      bubbles: false,
      cancelable: true
    });
  
    document.getElementById(idname).dispatchEvent(evt);
}

function _download_svg() {

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

    var modelID = 'id-model-0';
    var view = ormjs.models[modelID].currentview;

    // Close popups
    ormjs.PropertyMenu.remove_all_popups(() => console.log('Popups removed.'))
    // Datum to json string
    jsonify_data(modelID);
    // Add styling to svg
    add_style_data(view.id);
    // Get SVG
    var svgid = view.id;
    var rawSvg = new XMLSerializer().serializeToString(d3.select(`#${svgid}`).node());
    d3.select("#downloadSvgButton").attr('href', "data:image/svg+xml;base64," + utoa( rawSvg ));

    // Remove styling from svg
    remove_style_data(view.id);
}

function utoa(data) {
    return btoa(unescape(encodeURIComponent(data)));
}

function _download_name(df,suff) {
    if(!(d3.select("#uploadname").html()  === "")) {
        return d3.select("#uploadname").html().split(".")[0] + suff;
    }
    return df;
}

function jsonify_data(modelID) {
    /*
      Convert all datums into json strings. 
      Add as a string value to the attribute "json".
     */

    var objects = ormjs.models[modelID].objects;
    var jsobjects = ormjs.object_kinds;
    jsobjects.map( (kind) => {
        for ( var objID in objects[kind] ) {
            objects[kind][objID].d3object.attr("json",
                JSON.stringify( objects[kind][objID].d3object.datum() 
            ));
        }
    });
}

function add_style_data(svgid) {

    /*
      For every id on the canvas, get it's style data and add to the element.

      This step is required for SVGs to display with ORMJS styling outside
      the ORMJS environment.
     */
    //var svgid = view.d3object.attr("id");
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

function _upload_svg() {

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
    var modelID = 'id-model-0';
    var view = ormjs.models[modelID].currentview;

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
        remove_style_data(view.id);
        
        // Get state from data
        initialize_globals(modelID);
        populate_state(modelID);
        populate_actions(modelID);

        // Update ORM
        ormjs.models[modelID].update();
    }
    reader.onerror = error => console.log(error);

}

function initialize_globals(modelID) {

    // Set orm data object which tracks ORM model objects.

    ormjs.models[modelID].initialize_objects();
    ormjs.models[modelID].initialize_metamodel();
}

function populate_state(modelID) {

    /*
       Two actions are key to populating the state:
       1. Populate the datum of each object with the JSON string that was
          set at download.
       2. Set the global orm data by adding each object, keyed by its id. 
          Set the highest id number for each object type (used to add new objects).

       Note: Order is important! The various objects are populated in an order than
       prevents errors when model update is triggered.
     */

    // Order matters!
    var class_type = ["svg_prototype", "connector_prototype", "rolebox_prototype", 
                      "rolebox_group", "constraint_prototype", 
                      "entity_prototype", "value_prototype"];
    class_type.map( (cls) => {
        populate_orm_state(cls);
    });
    var objects = ormjs.models[modelID].objects;
    ormjs.object_kinds.map( (kind) => {
        objects[`highest_${kind}_id`] = set_highest_ID(objects[kind]);
    });
    
    /*// SVG
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
    orm.highestConstID = set_highest_ID(orm.constraints);*/

}

function populate_orm_state(class_name) {
    // Get all divs of class
    var object_divs = d3.select("#canvas").selectAll("."+class_name);

    // Iterate through nodes of class
    for ( var k in object_divs.nodes() ) { 
        // Add object to orm list
        var anyID = object_divs.nodes()[k].id;
        var d3object = d3.select("#"+anyID);
        // Populate datum
        d3object.datum( JSON.parse(d3object.attr("json")) );
        // Create object
        if( class_name == "connector_prototype") { 
            var obj = new ormjs.Connector({d3object: d3object}); 
            obj.record();
        }
        if( class_name == "constraint_prototype") { 
            new ormjs.Constraint({d3object: d3object}); 
        }
        if( class_name == "svg_prototype" ) {
            var obj = new ormjs.View({d3object: d3object});
            // Only one SVG
            obj.set_current();
        }
        if( class_name == "entity_prototype") { 
            new ormjs.Entity({d3object: d3object}); 
        }
        if( class_name == "value_prototype") { 
            new ormjs.Value({d3object: d3object}); 
        }
        if( class_name == "rolebox_group") { 
            new ormjs.Predicate({d3object: d3object}); 
        }
        if( class_name == "rolebox_prototype") { 
            new ormjs.Rolebox({d3object: d3object}); 
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

function populate_actions(modelID) {

    /*
       For every object in the model, attach the actions it can perform.
       This is crucial on upload to ensure that objects are interactive.
     */

    //svg_actions( d3.select("#canvas-svg") );
    //svg = d3.select("#canvas-svg");

    var objects = ormjs.models[modelID].objects;
    ormjs.object_kinds.map( (kind) => {
        for (var objID in objects[kind]) {
            objects[kind][objID].actions();
        }
    });

    /*for ( var svgID in orm.views ) {
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
    }*/
}

function remove_style_data(svgid) {
    // For every id on the canvas, remove inline style data from the element.
    //var svgid = svg.attr("id");
    var idlist = document.getElementById(svgid).querySelectorAll('[id]');
    for (var dv in idlist ) {
        if ( idlist[dv].id ) {
            d3.select("#"+idlist[dv].id).attr("style", null );
        }
    }
}