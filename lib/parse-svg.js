var orm;
var svg;

function download_svg() {
    // Datum to json string
    jsonify_data();
    // Get SVG
    var rawSvg = new XMLSerializer().serializeToString(d3.select("#canvas svg" ).node());
    d3.select("#downloadSvgButton").attr('href', "data:image/svg+xml;base64," + utoa( rawSvg ));
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
        rboverlays : {},
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

    // Relationships
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