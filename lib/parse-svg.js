var orm;
var svg;

function download_svg() {
    // Datum to json string
    jsonify_data();
    // Get SVG
    var rawSvg = new XMLSerializer().serializeToString(d3.select("#canvas svg" ).node());
    d3.select("#downloadSvgButton").attr('href', "data:image/svg+xml;base64," + btoa( rawSvg ));
}

function jsonify_data() {
    for ( var entityID in orm.entities ) {
        orm.entities[entityID].attr("json",JSON.stringify( orm.entities[entityID].datum() ));
    }
    for ( var oentityID in orm.eoverlays ) {
        orm.eoverlays[oentityID].attr("json",JSON.stringify( orm.eoverlays[oentityID].datum() ));
    }
    for ( var relID in orm.relationships ) {
        orm.relationships[relID].attr("json",JSON.stringify( orm.relationships[relID].datum() ));
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
    }
    reader.onerror = error => console.log(error);

}

function initialize_globals() {
    orm = {
        entities : {},
        eoverlays : {},
        relationships : {},
        highestEntityID : 0,
        highestRelID : 0
    }
}

function populate_state() {
    
    // Entities
    var entity_divs = d3.select("svg").selectAll(".entity_instance");
    for ( k in entity_divs.nodes() ) { 
        // Add entity to entities list
        entityID = entity_divs.nodes()[k].id;
        orm.entities[entityID] = d3.select("#"+entityID);
        // Populate datum
        orm.entities[entityID].datum( JSON.parse(orm.entities[entityID].attr("json")) );
        // Add overlay to overlays list
        oentityID = overlay_from_ID(entityID);
        orm.eoverlays[oentityID] = d3.select( "#"+oentityID );
        // Populate datum
        orm.eoverlays[oentityID].datum( JSON.parse(orm.eoverlays[oentityID].attr("json")) );
    }

    set_highest_entity_ID();

    // Relationships
    var rel_divs = d3.select("svg").selectAll("path");
    for ( k in rel_divs.nodes() ) { 
        // Add relationship to relationships list
        relID = rel_divs.nodes()[k].id;
        orm.relationships[relID] = d3.select("#"+relID);
        // Populate datum
        orm.relationships[relID].datum( JSON.parse(orm.relationships[relID].attr("json")) );
    }

    set_highest_rel_ID();
}

function populate_actions() {

    svg_actions( d3.select("#canvas-svg") );
    svg = d3.select("#canvas-svg");

    for ( var entityID in orm.entities ) {
        entity_actions( orm.entities[entityID] );
    }

    for (var oentityID in orm.eoverlays ) {
        overlay_actions( orm.eoverlays[oentityID] );
    }

    for ( var relID in orm.relationships ) {
        relationship_actions( orm.relationships[relID] );
    }
}