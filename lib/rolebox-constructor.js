/*
    Everything related to roleboxes
*/

/***** Rolebox property definitions *****/

var rb_param = {
    width : 50,
    height : 18,
    snapTolerance : 15
};

var svg;
var orm;

function generate_roleboxID() {
    rbID = "id-rolebox-" + orm.highestRBID.toString();
    orm.highestRBID += 1;
    return rbID
}

function is_roleboxID(anyID) {
    if ( anyID.includes("rolebox") ) { return true; }
    return false;
}

function rolebox_number(rbID) {
    return rbID.split("-")[2]
}

function set_highest_rolebox_ID() {
    for (var rbID in orm.roleboxes) {
        var numID = parseInt( entity_number(rbID) );
        if ( numID == orm.highestRBID ) {
            orm.highestRBID = numID+1;
        }
    }
}

function rolebox_prototype(defs) {

    /* Define the look of a rolebox */

    var width = rb_param.width;
    var height = rb_param.height;

    //var g = create_group(defs,width,height,"rolebox_prototype");
    // Entity rectangle

    var go = create_group(defs,width,height,"rolebox_overlay_prototype");
    // Top circle overlay
    go.append("circle")
        .attr("class","rboverlay")
        .attr("transform", "translate( " + width/2 + " " + 0 + " )");
    // Right circle overlay
    go.append("circle")
        .attr("class","rboverlay")
        .attr("transform", "translate( " + width + " " + height/2 + " )");
    // Bottom circle overlay
    go.append("circle")
        .attr("class","rboverlay")
        .attr("transform", "translate( " + width/2 + " " + height + " )");
    // Left circle overlay
    go.append("circle")
        .attr("class","rboverlay")
        .attr("transform", "translate( " + 0 + " " + height/2 + " )");

    var osize = rb_param.height;
    var oboxsize = 1.2*osize;
    var transx = -width;
    var transy = 0;

    var addo = create_group(defs,oboxsize,oboxsize,"rolebox_add_prototype");
    addo.attr("transform", "translate( " + transx + " -" + transy + " )");
    addo.append("path")
        .attr("d", plusPath(osize))
        .attr("class","overlay rbadd");
    
}

function plusPath(size) {
    var hsize = size/2;
    return [
        "M", 0, ",", -hsize,
        "L", 0, ",", hsize,
        "M", -hsize, ",", 0,
        "L", hsize, ",", 0,
        "Z"
    ].join("");
}

function draw_rolebox(x,y) {

    // Draw a new instance of a rolebox

    // Create rolebox id
    var rbID = generate_roleboxID();

    var rbname = "rolebox 0";

    var rbgroup = svg.append("g")
        .datum( {x: 0, y: 0, x0: x, y0: y,
                 selected: false, kind: "rolebox",
                 entity: null, boxes: [], name: rbname} )
        .attr("id",rbID)
        .attr("class", "rolebox_group")
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y) });
    rbgroup
        .append("text")
        .attr("class","ename")
        .attr("id","t-"+rbID)
        .attr("x", function(d){ return (d.x0) })
        .attr("y", function(d){ return (d.y0 - 1.5*rb_param.height) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "center")
        .attr("pointer-events","none")
        .text( rbname );
    
    add_rolebox(rbgroup);
    
    rolebox_group_actions(rbgroup);

    // Record new entity
    orm.roleboxes[rbID] = rbgroup;

    // Create new overlay for rolebox

    var overlayID = "o-r-0-"+rbID;
    
    var overlay = svg.append("use")
       .datum( {x: x, y: y, selected: false} )
       .attr("href","#rolebox_overlay_prototype")
       .attr("id", overlayID)
       .attr("x", function(d){ return (x) })
       .attr("y", function(d){ return (y) });

    //overlay_actions(overlay);
    
    // Record overlay
    orm.rboverlays[overlayID] = { link : null, add : null};
    orm.rboverlays[overlayID].link = overlay;

    var addrbID = "add-"+rbID;

    var addoverlay = svg.append("use")
        .datum( {x: x, y: y, selected: false} )
        .attr("href","#rolebox_add_prototype")
        .attr("id", addrbID)
        .attr("x", function(d){ return (x) })
        .attr("y", function(d){ return (y) })
        .on("click", function() { add_rolebox(rbgroup); });
    
    // Record overlay
    orm.rboverlays[overlayID].add = addoverlay;

}

function add_rolebox(rbgroup) {

    // Data related to identifying new rolebox
    var d = rbgroup.datum();
    var boxcount = d.boxes.length;
    var rbID = rbgroup.attr("id");
    var boxID = "r-" + boxcount.toString() + "-" + rbID;
    d.boxes.push(boxID);

    var x = parseFloat( rbgroup.attr("x") );
    var y = parseFloat( rbgroup.attr("y") );

    console.log(x, y);
    console.log(d);

    // Rolebox visualization
    rbgroup.append("rect")
           .datum({ relationships: [] })
           .attr("class","rolebox")
           .attr("id", boxID)
           .attr("parent", rbID)
           .attr("transform", "translate( -" + rb_param.width/2 + 
                                        " -" + rb_param.height/2 + " )")
           .attr("x", function(){
                return d.x0 + boxcount * rb_param.width;
           })
           .attr("y", function(){
                return d.y0;
           })
    // Adjust text
    rbtext = d3.select("#t-"+rbID)
    d3.select("#t-"+rbID)
        .attr("x", function() { 
            return (d.x0 + boxcount * rb_param.width/2) 
        })
        
    rolebox_actions( d3.select("#"+boxID) );
}

/* Rolebox actions */

function rolebox_group_actions(rbgroup) {

    // What to do on drag event

    var drag_rb = d3.drag()
        .on("start", rbdragstarted)
        .on("drag", function (event,d) { rbdragged(event,d, rbgroup.attr("id") ) } )
        .on("end", edragended);

    rbgroup
        .on("dblclick", function(event) { event.stopPropagation() })
        //.on("click", remove_entity)
        .call(drag_rb);

}

function rbdragstarted(event,d) {
    //event.sourceEvent.stopPropagation();
    //d3.select(this).classed("selected", true);
    d.selected = true;
    rbgroup = d3.select(this);
    console.log( rbgroup.attr("x") );

    // We initialize the position here so we don't get a jump
    // the first time we drag the group.
    //d.x = parseFloat( rbgroup.attr("x") );
    //d.y = parseFloat( rbgroup.attr("y") );

}

function rbdragged(event,d,rbgroupID) {

    // Set the new position
    d.x += event.dx;
    d.y += event.dy;

    // Snap (not added yet)
    var rbgroup = d3.select("#"+rbgroupID);
    var x = parseFloat(rbgroup.attr("x"));
    var y = parseFloat(rbgroup.attr("y"));

    // Drag rolebox group
    // Groups must be moved with transform
    rbgroup.attr("x", d.x )
           .attr("y", d.y )
           .attr("transform", "translate("+d.x+","+d.y+")");
}

/* Remove rolebox */

function rolebox_actions(rbox) {
    rbox
        .on("click", remove_rolebox);
}

function remove_rolebox(event,d) {
    if (event.ctrlKey) {
        delete_rolebox( d3.select(this) );
    }
}

function delete_rolebox(rbox) {

    // Get parent group of rolebox
    d = rbox.datum();
    rbgroup = d3.select("#"+rbox.attr("parent"));
    gd = rbgroup.datum();

    // Remove relationships
    rels = d.relationships;
    for ( n in rels ) {
        delete_relationship(orm.relationships[ rels[n] ]);
        // Remove relationship reference from parent
        gd.relationships = remove_from_array( gd.relationships, rels[n] );
    }

    // Remove box reference from parent
    rboxID = rbox.attr("id");
    gd.relationships = remove_from_array( gd.boxes, rboxID );

    // Remove the rolebox visualization
    // Remove overlay part
    //d3.select( "#" + overlay_from_ID(entityID) ).remove();
    // Remove box part
    rbox.remove();
    
    // Remove the rolebox from records
    var x = gd.x + gd.x0;
    var y = gd.y + gd.y0;
    if ( gd.boxes.length == 0 ) {
        // Remove group reference
        delete orm.roleboxes[ rboxID ];
        // Remove group
        rbgroup
            .transition()
            .duration(500)
            .attr("transform", "translate(" + x + "," + y + ") scale(0)")
            .remove();
    }
    //delete orm.roleboxes[ rboxID ];
    //delete orm.eoverlays[ overlay_from_ID(entityID) ];
}