var entities;
var relationships;

function download_svg() {
    // Datum to json string
    jsonify_data();
    // Get SVG
    var rawSvg = new XMLSerializer().serializeToString(d3.select("#canvas svg" ).node());
    console.log(rawSvg);
    d3.select("#downloadSvgButton").attr('href', "data:image/svg+xml;base64," + btoa( rawSvg ));
}

function jsonify_data() {
    for ( var entityID in entities ) {
        entities[entityID].attr("json",JSON.stringify( entities[entityID].datum() ));
    }
    for ( var oentityID in eoverlays ) {
        eoverlays[oentityID].attr("json",JSON.stringify( eoverlays[oentityID].datum() ));
    }
    for ( var relID in relationships ) {
        relationships[relID].attr("json",JSON.stringify( relationships[relID].datum() ));
    }
}

function upload_svg() {
    data = `
    <svg xmlns="http://www.w3.org/2000/svg" width="90vw" height="90vh"><defs><g id="entity_prototype" class="entity_prototype" width="100" height="50" transform="translate( -50 -25 )"><rect class="entity"/></g><g id="entity_overlay_prototype" class="entity_overlay_prototype" width="100" height="50" transform="translate( -50 -25 )"><circle class="eoverlay" transform="translate( 50 0 )"/><circle class="eoverlay" transform="translate( 100 25 )"/><circle class="eoverlay" transform="translate( 50 50 )"/><circle class="eoverlay" transform="translate( 0 25 )"/></g></defs><g id="id-entity-0" class="entity_instance" json="{&quot;x&quot;:177,&quot;y&quot;:170,&quot;selected&quot;:false,&quot;kind&quot;:&quot;entity&quot;,&quot;relationships&quot;:[&quot;id-rel-0&quot;],&quot;name&quot;:&quot;Entity 0&quot;}"><use href="#entity_prototype" id="r-id-entity-0" x="177" y="170"/><text class="ename" id="t-id-entity-0" x="177" y="170" text-anchor="middle" dominant-baseline="central" pointer-events="none">Entity 0</text></g><use href="#entity_overlay_prototype" id="o-id-entity-0" x="177" y="170" json="{&quot;x&quot;:100,&quot;y&quot;:100,&quot;selected&quot;:false}"/><g id="id-entity-1" class="entity_instance" json="{&quot;x&quot;:658,&quot;y&quot;:263,&quot;selected&quot;:false,&quot;kind&quot;:&quot;entity&quot;,&quot;relationships&quot;:[&quot;id-rel-0&quot;],&quot;name&quot;:&quot;Entity 1&quot;}"><use href="#entity_prototype" id="r-id-entity-1" x="658" y="263"/><text class="ename" id="t-id-entity-1" x="658" y="263" text-anchor="middle" dominant-baseline="central" pointer-events="none">Entity 1</text></g><use href="#entity_overlay_prototype" id="o-id-entity-1" x="658" y="263" json="{&quot;x&quot;:658,&quot;y&quot;:263,&quot;selected&quot;:false}"/><path class="rel_subtype" id="id-rel-0" d="M0,0.25L388.186180276664,0.25L388.186180276664,2L392.186180276664,0L388.186180276664,-2L388.186180276664,-0.25L0,-0.25Z" transform="translate(227 170) rotate(13.717346318360326)" json="{&quot;x1&quot;:227,&quot;y1&quot;:170,&quot;x2&quot;:608,&quot;y2&quot;:263,&quot;kind&quot;:&quot;relation&quot;,&quot;selected&quot;:false,&quot;reltype&quot;:&quot;subtype&quot;,&quot;from&quot;:&quot;id-entity-0&quot;,&quot;to&quot;:&quot;id-entity-1&quot;}"/></svg>
    `;
    console.log(data);
    d3.select("#canvas").html(data);
    populate_state();
    populate_actions();
}

function populate_state() {
    
    // Entities
    var entity_divs = d3.select("svg").selectAll(".entity_instance");
    for ( k in entity_divs.nodes() ) { 
        // Add entity to entities list
        entityID = entity_divs.nodes()[k].id;
        entities[entityID] = d3.select("#"+entityID);
        // Populate datum
        entities[entityID].datum( JSON.parse(entities[entityID].attr("json")) );
        // Add overlay to overlays list
        oentityID = overlay_from_ID(entityID);
        eoverlays[oentityID] = d3.select( "#"+oentityID );
        // Populate datum
        eoverlays[oentityID].datum( JSON.parse(eoverlays[oentityID].attr("json")) );

        console.log( entities[entityID].datum() );
    }

    // Relationships
    var rel_divs = d3.select("svg").selectAll("path");
    for ( k in rel_divs.nodes() ) { 
        // Add relationship to relationships list
        relID = rel_divs.nodes()[k].id;
        relationships[relID] = d3.select("#"+relID);
        // Populate datum
        relationships[relID].datum( JSON.parse(relationships[relID].attr("json")) );
    }
}

function populate_actions() {

    for ( var entityID in entities ) {
        entity_actions( entities[entityID] );
    }

    for (var oentityID in eoverlays ) {
        overlay_actions( eoverlays[oentityID] );
    }

    for ( var relID in relationships ) {
        relationship_actions( relationships[relID] );
    }
}