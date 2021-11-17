var orm;
var svg;

// ------ Download --------

function download_svg() {
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
    for ( var entityID in orm.entities ) {
        orm.entities[entityID].attr("json",JSON.stringify( orm.entities[entityID].datum() ));
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

    // For every id on the canvas, get it's style data and add to the element.
    var idlist = document.getElementById("canvas-svg").querySelectorAll('[id]');
    var support = supported_style_list();
    for (var dv in idlist ) {
        if ( idlist[dv].id ) {
            d3.select("#"+idlist[dv].id).attr("style", () => dumpCSSText(idlist[dv].id, support) );
            if ( idlist[dv].id.includes("entity") ) { add_style_attrs(idlist[dv].id) }
            //add_style_attrs( idlist[dv].id );
        }
    }
}

function supported_style_list() {
    /* Style elements important for exporting SVG with CSS

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
    // Get a string of all CSS associated with the element
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

    var stylelist = ['rx','ry','fill','opacity','height'];
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
    orm = {
        entities : {},
        connectors : {},
        rbgroups : {},
        roleboxes : {},
        highestEntityID : 0,
        highestRelID : 0,
        highestRBID : 0
    };
}

function populate_state() {
    
    // Entities
    var entity_divs = d3.select("svg").selectAll(".entity_prototype");
    for ( k in entity_divs.nodes() ) { 
        // Add entity to entities list
        entityID = entity_divs.nodes()[k].id;
        orm.entities[entityID] = d3.select("#"+entityID);
        // Populate datum
        orm.entities[entityID].datum( JSON.parse(orm.entities[entityID].attr("json")) );
    }

    set_highest_entity_ID();

    // Connectors
    var conn_divs = d3.select("svg").selectAll(".connector");
    for ( k in conn_divs.nodes() ) { 
        // Add connector to connectors list
        connID = conn_divs.nodes()[k].id;
        orm.connectors[connID] = d3.select("#"+connID);
        // Populate datum
        orm.connectors[connID].datum( JSON.parse(orm.connectors[connID].attr("json")) );
    }

    set_highest_conn_ID();

    // Rolebox groups
    var rolebox_divs = d3.select("svg").selectAll(".rolebox_group");
    for ( k in rolebox_divs.nodes() ) { 
        // Add connector to connectors list
        rbID = rolebox_divs.nodes()[k].id;
        orm.rbgroups[rbID] = d3.select("#"+rbID);
        // Populate datum
        orm.rbgroups[rbID].datum( JSON.parse(orm.rbgroups[rbID].attr("json")) );
    }
    // Roleboxes
    var rolebox_divs = d3.select("svg").selectAll(".rolebox_prototype");
    for ( k in rolebox_divs.nodes() ) { 
        // Add connector to connectors list
        rbID = rolebox_divs.nodes()[k].id;
        orm.roleboxes[rbID] = d3.select("#"+rbID);
        // Populate datum
        orm.roleboxes[rbID].datum( JSON.parse(orm.roleboxes[rbID].attr("json")) );
    }

    set_highest_rolebox_ID()
}

function populate_actions() {

    svg_actions( d3.select("#canvas-svg") );
    svg = d3.select("#canvas-svg");

    for ( var entityID in orm.entities ) {
        entity_actions( orm.entities[entityID] );
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
    // For every id on the canvas, get it's style data and add to the element.
    var idlist = document.getElementById("canvas-svg").querySelectorAll('[id]');
    for (var dv in idlist ) {
        if ( idlist[dv].id ) {
            d3.select("#"+idlist[dv].id).attr("style", null );
        }
    }
}