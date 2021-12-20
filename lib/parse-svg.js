var orm; // Defined here
var metamodel; // Defined here
var svg; // Defined in svg constructor

// ------ Download --------

function download_svg() {

    /*
       Execute on click of download button.

       Prepare SVG for download includes 2 important data modifications:
       1. All object data is converted to a json string for recovery if the
          file is uploaded to ORMJS.
       2. Styles associated with the elements are added as inline styles. So
          the SVG displays correctly outside the ORMJS environment.
     */
    // Close popups
    remove_all_popups(() => console.log('Popups removed.'))
    // Datum to json string
    jsonify_data();
    // Add styling to svg
    add_style_data();
    // Get SVG
    var rawSvg = new XMLSerializer().serializeToString(d3.select("#canvas svg" ).node());
    d3.select("#downloadSvgButton").attr('href', "data:image/svg+xml;base64," + utoa( rawSvg ));

    // Remove styling from svg
    remove_style_data();
}

function utoa(data) {
    return btoa(unescape(encodeURIComponent(data)));
  }

function jsonify_data() {
    /*
      Convert all datums into json strings. 
      Add as a string value to the attribute "json".
     */
    for ( var entityID in orm.entities ) {
        orm.entities[entityID].attr("json",JSON.stringify( orm.entities[entityID].datum() ));
    }
    for ( var valueID in orm.values ) {
        orm.values[valueID].attr("json",JSON.stringify( orm.values[valueID].datum() ));
    }
    for ( var connID in orm.connectors ) {
        orm.connectors[connID].attr("json",JSON.stringify( orm.connectors[connID].datum() ));
    }
    for ( var rbID in orm.roleboxes ) {
        orm.roleboxes[rbID].attr("json",JSON.stringify( orm.roleboxes[rbID].datum() ));
    }
    for ( rbID in orm.rbgroups ) {
        orm.rbgroups[rbID].attr("json",JSON.stringify( orm.rbgroups[rbID].datum() ));
    }
}

function add_style_data() {

    /*
      For every id on the canvas, get it's style data and add to the element.

      This step is required for SVGs to display with ORMJS styling outside
      the ORMJS environment.
     */
    var idlist = document.getElementById("canvas-svg").querySelectorAll('[id]');
    var support = supported_style_list();
    for (var dv in idlist ) {
        if ( idlist[dv].id ) {
            d3.select("#"+idlist[dv].id).attr("style", () => dumpCSSText(idlist[dv].id, support) );
            if ( idlist[dv].id.includes("r-id-entity") ) { add_style_attrs(idlist[dv].id) }
            if ( idlist[dv].id.includes("r-id-value") ) { add_style_attrs(idlist[dv].id) }
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
    return ['filter','fill','cursor','opacity','stroke','stroke-width','height','width',
            'rx','ry','r','font-family','font-size','paint-order','color', 'dominant-baseline',
            'text-anchor']
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
        entities : {},
        connectors : {},
        rbgroups : {},
        roleboxes : {},
        values : {},
        highestEntityID : 0,
        highestConnID : 0,
        highestRBID : 0,
        highestValueID : 0,
    };

    metamodel = { Objects: {}, Facts: {} };
}

function populate_state() {

    /*
       Two actions are key to populating the state:
       1. Populate the datum of each object with the JSON string that was
          set at download.
       2. Set the global orm data by adding each object, keyed by its id. 
          Set the highest id number for each object type (used to add new objects).
     */
    
    // Entities
    populate_orm_state("entity_prototype", "entities");
    // Identify highest entity ID
    orm.highestEntityID = set_highest_ID(orm.entities);

    // Values
    populate_orm_state("value_prototype", "values");
    // Identify highest entity ID
    orm.highestValueID = set_highest_ID(orm.values);

    // Connectors
    populate_orm_state("connector", "connectors");
    // Identify highest connector ID
    orm.highestConnID = set_highest_ID(orm.connectors);

    // Rolebox groups
    populate_orm_state("rolebox_group", "rbgroups");
    // Identify highest rolebox group ID
    orm.highestRBID = set_highest_ID(orm.rbgroups);

    // Roleboxes
    populate_orm_state("rolebox_prototype", "roleboxes");

    // Bugfix TEMPORARY
    height_bugfix(orm.entities, entity_param.height);
    height_bugfix(orm.roleboxes, rb_param.height);
    height_bugfix(orm.rbgroups, rb_param.height);
    rbgroup_bugfix();

    console.log(orm);
}

function height_bugfix(objectlist, height_param) {
    // TEMPORARY fix for backward compatibility
    for (var k in objectlist) {
        objectlist[k].attr("height", height_param);
        console.log(objectlist[k].attr("id"), objectlist[k].attr("height"))
    }
}

function rbgroup_bugfix() {
    // TEMPORARY fix for backward compatibility
    for (var k in orm.rbgroups) {
        set_central_fact_position(orm.rbgroups[k]);
    }
}

function populate_orm_state(class_name, orm_object_name) {
    // Get all divs of class
    var object_divs = d3.select("svg").selectAll("."+class_name);
    // Iterate through nodes of class
    for ( var k in object_divs.nodes() ) { 
        // Add object to orm list
        anyID = object_divs.nodes()[k].id;
        orm[orm_object_name][anyID] = d3.select("#"+anyID);
        // Populate datum
        orm[orm_object_name][anyID].datum( JSON.parse(orm[orm_object_name][anyID].attr("json")) );
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

    svg_actions( d3.select("#canvas-svg") );
    svg = d3.select("#canvas-svg");

    for ( var entityID in orm.entities ) {
        entity_actions( orm.entities[entityID] );
    }

    for ( var valueID in orm.values ) {
        value_actions( orm.values[valueID] );
    }

    for ( var connID in orm.connectors ) {
        connector_actions( orm.connectors[connID] );
    }

    for ( var rbID in orm.rbgroups ) {
        rolebox_group_actions( orm.rbgroups[rbID] );
    }

    for ( var rbID in orm.roleboxes ) {
        rolebox_actions( orm.roleboxes[rbID] );
    }
}

function remove_style_data() {
    // For every id on the canvas, remove inline style data from the element.
    var idlist = document.getElementById("canvas-svg").querySelectorAll('[id]');
    for (var dv in idlist ) {
        if ( idlist[dv].id ) {
            d3.select("#"+idlist[dv].id).attr("style", null );
        }
    }
}