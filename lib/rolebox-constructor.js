/*
    Everything related to facts and roleboxes

    This file defines roleboxes, data associated with how they are represented and
    connected to other objects, and actions they can perform, such as on drag and 
    click events.
*/

/*----- Global definitions -----*/

// Rolebox appearance and behavior
// These quantities are pulled from the style sheet, orm-style.css
var rb_param = {
    width : parse_number( get_css_variable('--rolebox-width') ),
    height : parse_number( get_css_variable('--rolebox-height') ),
    snapTolerance : parse_number( get_css_variable('--rolebox-width') )/10
};

// Distance tolerances for snap and link events
var tolerance; // Defined in graph-constructor
tolerance.link["rolebox"] = rb_param.width ;
tolerance.snap["rolebox"] = rb_param.snapTolerance ;
tolerance.snap["rolebox_group"] = rb_param.snapTolerance ;

// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg
var dragevent; // Defined in graph-constructor
var mult_param = { none: "none", one: "one", many: "many", skip: "skip"} // Defined here

/*----- END Global definitions -----*/

/*----- Rolebox IDS -----*/

function generate_roleboxID() {
    /* ID of the rolebox group (which defines a predicate) */
    rbID = "id-rolebox-" + orm.highestRBID.toString();
    orm.highestRBID += 1;
    return rbID
}

function is_roleboxID(anyID) {
    /* Does anyID play any part in a rolebox group? 
       (Returns true for boxes, text, etc as well as rolebox group) */
    if ( anyID.includes("rolebox") ) { return true; }
    return false;
}

/*----- END Rolebox IDs -----*/

/*-----  Drawing roleboxes -----*/

function fact_definition(x,y,rbID) {

    /* Define the fact (rolebox group) appearance (its display name and
       overlay) and initialize its datum. */

    var rbgroup = svg.append("g")
        .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                 xc: x, yc: y, // Central position of fact vs center of 1st box for x,y
                 selected: false, 
                 kind: "rolebox_group",
                 name: "", 
                 rname : "",
                 entity_in: null, 
                 mandatory: false,
                 boxes: [], 
                 connectors: [],
                 flipped: false, rotated: false, arrow: false} )
        .attr("id",rbID)
        .attr("class", "rolebox_group")
        .attr("x", -rb_param.width/2 )
        .attr("y", -rb_param.height/2 );
    
    // Append name of fact
    rbgroup
        .append("text")
        .attr("class","rbname")
        .attr("id","t-"+rbID)
        .attr("x", function(d){ return (d.x0) })
        .attr("y", function(d){ return (d.y0 - 1.5*rb_param.height) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "center")
        .attr("pointer-events", mult_param.none)
        .text( function(d){ return d.name } );

    // Add overlay used for adding roleboxes to the group
    var addrbID = "add-"+rbID;
    var osize = rb_param.height;
    rbgroup
        .append("path")
        .attr("d", function(d) { return plusPath(d,osize) } )
        .attr("class","rbadd")
        .attr("id", addrbID)
        .attr("transform", () => translate(-rb_param.width, 0) );

    return rbgroup
}

function draw_fact(x,y) {

    /* Draw a new instance of a fact (rolebox group) */

    // Create rolebox id (this is for the rolebox group)
    var rbID = generate_roleboxID();

    // Define the rolebox group and its datum
    var rbgroup = fact_definition(x,y,rbID);

    // Add 1st rolebox to group, including overlays and actions
    add_rolebox(rbgroup);

    // Add actions that apply to the whole group
    rolebox_group_actions(rbgroup);

    // Record new rolebox group
    orm.rbgroups[rbID] = rbgroup;

    // Update orm
    parse_orm();

}

function plusPath(position, size) {

    // Draw the plus sign overlay for adding new roleboxes
    var hsize = size/2;
    return [
        "M", position.x, ",", position.y-hsize,
        "L", position.x, ",", position.y+hsize,
        "M", position.x-hsize, ",", position.y,
        "L", position.x+hsize, ",", position.y,
        "Z"
    ].join("");
}

function draw_box(rbgroup) {

    /* Add a new rolebox to the fact rbgroup.
       Define the rolebox appearance (box and overlays) 
       and initialize its datum. Add information
       about the box to the parent rbgroup. */

    // Data related to identifying new rolebox
    var d = rbgroup.datum();
    var boxcount = d.boxes.length;
    var rbID = rbgroup.attr("id");
    var boxID = "r-" + boxcount.toString() + "-" + rbID;
    var rbname = "rolebox " + boxcount.toString() ;

    // Rolebox visualization
    rbgroup.append("g")
           .datum( {x : d.x + boxcount * rb_param.width,
                    y : d.y,
                    dx : boxcount * rb_param.width, // this is used for the overlay definition
                    kind : "rolebox",
                    name : rbname,
                    parent: rbID,
                    overlay: "o"+boxID,
                    multiplicity: mult_param.none,
                    entity: null, 
                    mandatory: false,
                    connectors : [],
                    selected : false } )
           .attr("class","rolebox_prototype")
           .attr("id", boxID)
           .attr("parent", rbID)
           .attr("x", function(){
                return d.x0 + boxcount * rb_param.width;
           })
           .attr("y", function(){
                return d.y0;
           })
           .attr("width", rb_param.width)
           .attr("height", rb_param.height)
           .append("rect")
                .attr("class","rolebox")
                .attr("id", "r-" + boxID)
                .attr("width", rb_param.width)
                .attr("height", rb_param.height)
                .attr("x", function(){
                            return d.x0 + boxcount * rb_param.width;
                    })
                .attr("y", function(){
                            return d.y0;
                    })
                .attr("transform", () => translate(-rb_param.width/2 , -rb_param.height/2));
    
    // Add to parent
    if (d.flipped) {
        // Add box to "end" of list (beginning bc flipped)
        var boxes = [...d.boxes];
        boxes.reverse();
        boxes.push(boxID);
        boxes.reverse();
        d.boxes = [...boxes];
        // Move rolebox group to account for flip
        d.dx -= rb_param.width;
        d.x = d.x0 + d.dx;
        move_rolebox_group(rbgroup);
        align_roleboxes(rbgroup); 
    } else {
        // Add box to end of list
        d.boxes.push(boxID);
    }

    var rbox = d3.select("#"+boxID);

    // Initialize uniqueness constraint
    add_rb_uniqueness_constraint(rbox);

    return rbox
}

function add_rolebox(rbgroup) {

    /* Add a rolebox to the fact rbgroup. This includes:
       1. The rolebox appearance and datum
       2. Adding rolebox information to rbgroup datum,
          updating display name
       3. Rolebox overlays
       4. Rolebox actions
       5. Updating where all connectors connect to the rbgroup
        */

    // Data related to identifying new rolebox
    var d = rbgroup.datum();

    // Add box
    var rbox = draw_box(rbgroup);
    var boxID = rbox.attr("id");

    // Update central position of rbgroup
    set_central_fact_position(rbgroup);
    
    // Add rolebox overlay
    var overlay = overlay_definition(rbox, "rboverlay");
    overlay.attr("rbox", rbox.attr("id") );
    
    // Add rolebox actions
    rolebox_actions( rbox );
    
    // Record rolebox
    orm.roleboxes[ boxID ] = rbox;

    // Adjust text on group
    set_rolebox_display_name(rbgroup);

    if ( d.boxes.length > 1 ) {
        // Update overlay connections for box to the left of new box
        var ind = 0;
        d.flipped ? ind = 1 : ind = d.boxes.length - 2;
        set_eligible_overlays_rolebox( d.boxes[ind] );

        // Update orm
        parse_orm();
    }

    // Redraw connectors
    redraw_connectors(d.connectors);
}

function set_rolebox_display_name(rbgroup) {

    /* This is used to read the names of each box in the rolebox group and
       combine them into a total display name. The final name is centered
       based on the total size of the group. */
    
    var gd = rbgroup.datum();
    var boxcount = gd.boxes.length;

    // Get all names in a list, rbname
    var rbname = [];
    var boxes = [...gd.boxes];
    if (gd.flipped == true) { boxes = boxes.reverse(); }
    for ( n in boxes ) {
        // Get name and format
        d = d3.select("#"+boxes[n]).datum();
        d.name = format_rolebox_name(d.name);
        // Push name to list
        rbname.push( d.name );
    }
    // Join names
    gd.name = rbname.slice(0,2).join(" ");
    boxcount > 2 ? gd.name += " ... " + rbname.slice(2,boxcount).join(" ... ") : gd.name += "";
    gd.name = gd.name.trim();
    var display_name = gd.name;
    // Add arrow when flipped
    // 🞀 &#128896;
    gd.arrow ? display_name = "🞀 " + gd.name : display_name = gd.name;
    // Add reverse name
    gd.rname = format_rolebox_name(gd.rname);
    if ( gd.rname.length > 0 ) { display_name += " / " + gd.rname; }
    // Set text field value and position
    tfield = d3.select("#t-" + rbgroup.attr("id"));
    tfield.text(display_name)
        .attr("x", function() { 
            return (gd.x0 + (boxcount-1) * rb_param.width/2) 
        });
}

function format_rolebox_name(rbname) {
    /* Format name appearance: Capitalize each word in entity name */
    return rbname.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toLowerCase()).trim();
}

function add_rb_uniqueness_constraint(rbox) {

    /* Append the uniqueness constraint to the rolebox as a path. 
       Default appearance is no UC. */

    var crbID = "c-"+rbox.attr("id");

    rbox
        .append("path")
        .attr("d", "" )
        .attr("class","rb_constraint")
        .attr("id", crbID);
}

function set_rb_uniqueness_constraint(rbox) {
    
    /* Change the rolebox uniqueness constraint visualization
       based on datum value. */

    var gd = d3.select("#"+rbox.datum().parent).datum();
    var d = rbox.datum();
    // Position of box wrt when rbgroup was created
    var pos = {x:gd.x0 + d.x - gd.x, y:gd.y0}; 
    // Possible uniqueness constraints
    var uconstraints = {};
    uconstraints[ mult_param.none ] = function() { return "" };
    uconstraints[ mult_param.many ] = many_box;
    uconstraints[ mult_param.one ] = unique_box;
    uconstraints[ mult_param.skip ] = skip_box;
    /*var uconstraints = {
        "none": function() { return "" },
        "many": many_box,
        "one": unique_box,
        "skip": skip_box
    };*/

    var crbID = "c-"+rbox.attr("id");

    d3.select("#"+crbID)
        .attr("d", () => uconstraints[d.multiplicity]({x: 0, y:0}) )
        //.attr("x", pos.x)
        //.attr("y", pos.y);
        .attr("transform", () => translate(pos.x,pos.y));

}

/*  Flipping

    Rolebox groups (predicates) can be flipped to read right to left.
    This usually happens when displayed on the right side of the first entity
    linked to the group.
 */

function flip_rolebox_group(rbgroup) {
    
    /* Flip the rolebox order of a group of roleboxes */

    // Set flip in datum
    var gd = rbgroup.datum();
    gd.flipped ? gd.flipped = false : gd.flipped = true;
    gd.arrow = gd.flipped;

    // Reorder boxes in datum
    gd.boxes = gd.boxes.reverse();

    // Move each rolebox (group, rect, and overlay)
    align_roleboxes(rbgroup);
    // Update display name
    set_rolebox_display_name(rbgroup);
    // Redraw all connected connectors
    redraw_connectors(gd.connectors);
}

function align_roleboxes(rbgroup) {

    /* Move each rolebox (group, rect, and overlay)
       based on group position.*/

    var gd = rbgroup.datum();

    var x = gd.x0;
    var y = gd.y0;
    for (var n in gd.boxes) {
        move_rolebox(d3.select( "#"+gd.boxes[n] ),x,y);
        // Set eligible overlays for connectors
        set_eligible_overlays_rolebox(gd.boxes[n]);
        x += rb_param.width;
    }
    // Update position data in roleboxes
    set_rolebox_positions(rbgroup, gd.x, gd.y);
}

function move_rolebox(rbox,x,y) {
    
    /* Move rolebox to position x,y.
       (Might want to reconsider how we do this.) */

    // Move the group
    rbox
        .attr("x", x)
        .attr("y", y);
    // Move the rect
    d3.select("#r-"+rbox.attr("id"))
        .attr("x", x)
        .attr("y", y);
    // Move the uniqueness constraint
    d3.select("#c-"+rbox.attr("id"))
        .attr("transform", () => translate(x,y) );
    // Move the overlays
    var oID = rbox.datum().overlay;
    var width = parseInt( rbox.attr("width") );
    var height = parseInt( rbox.attr("height") );
    d3.select("#"+oID)
        .attr("transform", () => overlay_translate(x,y,width,height) );

}

function check_flip_condition(rbgroup) {

    /* Based on the rolebox group's position, determine whether or not to flip
       the rolebox.

       This function does *not* perform the actual flipping. Just decides
       whether or not to do it. Flip performed by flip_rolebox_group()
     */
    
    var gd = rbgroup.datum();
    var flipit = { flip: false, arrow: gd.arrow };

    // If not connected to an entity, do nothing
    if ( gd.entity_in == null ) { return flipit }
    // If single box, do nothing
    if ( gd.boxes.length == 1 ) { return flipit }

    // Get the entity and it's position information
    var entity = d3.select("#"+gd.entity_in);
    var ed = entity.datum();
    var ewidth = entity.attr("width")/2;

    // Decide whether to flip
    var fliptable = {0: false, 1: true};
    var flipme = 0;
    var isflipped = 0;
    gd.flipped ? isflipped = 1 : isflipped = 0;
    if (gd.rotated) {
        // Rolebox group is rotated 90 degrees
        // Flip if the rolebox is above the entity
        gd.yc < ed.y ? flipme = (1-isflipped) : flipme = isflipped;
    } else {
        // Flip if the rolebox is left of the entity
        gd.xc < ed.x ? flipme = (1-isflipped) : flipme = isflipped;
    }
    flipit.flip = fliptable[flipme];

    // Decide whether to display arrow
    // This isn't used in the current version. 
    // Needed to match ORM 2 rotation convention (but I don't know if we want to).
    flipit.arrow = fliptable[ Math.abs(isflipped - flipme) ];

    return flipit
}

function set_primary_entity(rbgroup) {

    /* This is the entity that connects to the first rolebox.
       Set this entity in the datum of the rolebox group.
       
       The primary entity is used to decide when to auto-flip 
       the rolebox group. */

    var gd = rbgroup.datum();
    var ind = 0;
    var boxes = gd.boxes;
    gd.flipped ? ind = boxes.length - 1 : ind = 0;
    gd.entity_in = d3.select("#"+boxes[ind]).datum().entity;
}

function get_primary_role(rbgroup) {

    /* This is the first rolebox. */

    var gd = rbgroup.datum();
    var ind = 0;
    var boxes = gd.boxes;
    gd.flipped ? ind = boxes.length - 1 : ind = 0;
    return boxes[ind];
}

/* Rotating */

function rotate_rolebox_group(rbgroup) {
    
    /* Flip the value of rotate in the datum and update the
       visualization of the fact (rbgroup) to align with datum. */

    // Flip rotate value in datum
    var d = rbgroup.datum();
    d.rotated = !d.rotated;

    // Apply rotate
    if ( d.rotated ) {
        rbgroup
            .attr("transform", () => translate_rotate(d.x,d.y,d.dx,d.dy));
    } else {
        rbgroup
            .attr("transform", () => translate(d.dx,d.dy));
    }
    
    // Update position data in roleboxes
    set_rolebox_positions(rbgroup, d.x, d.y);

    // Check flip condition and redraw connected connectors
    check_flip_and_connectors(rbgroup);
}

function check_flip_and_connectors(rbgroup) {
    
    /* Check flip condition. If flip = true, then
       flip the rolebox group.
       
       Redraw all connected connectors. */
    
    // Check flip condition
    var d = rbgroup.datum();
    var flipit = check_flip_condition(rbgroup);
    if (flipit.flip) {
        flip_rolebox_group(rbgroup);
    }
    // Redraw all connected connectors
    redraw_connectors(d.connectors);

}

function flip_mandatory_role(rbox) {

    /* If mandatory role is true, set to false. If false, set to true.
       Change visual to reflect the new mandatory/not status of the role. */

    var d = rbox.datum();
    if (d.entity == null) { return }
    d.mandatory ? d.mandatory = false : d.mandatory = true;
    for (var n in d.connectors ) {
        if ( d3.select("#"+d.connectors[n]).datum().conntype == conntypes.EtoRB ) {
            d3.select("#"+d.connectors[n]).datum().mandatory = d.mandatory;
            var conn = d3.select("#"+d.connectors[n]);
        }
    }
    // Redraw all connected connectors
    update_connector_positions(conn);
    draw_connector(conn);
    //redraw_connectors(d.connectors);

    // Update ORM
    parse_orm();
}

/*----- END Drawing roleboxes -----*/

/*----- Rolebox actions -----*/

function rolebox_group_actions(rbgroup) {

    /* What to do with a fact (rolebox group) on drag event, 
       double click event, or plus overlay click event. */

    // Drag rolebox group
    var drag_rb = d3.drag()
        .on("start", rbdragstarted)
        .on("drag", function (event,d) { rbdragged(event,d, rbgroup.attr("id") ) } )
        .on("end", edragended);

    // Double click: open popup
    rbgroup
        .on("dblclick", popup_event)
        .call(drag_rb);

    // Add rolebox to rbgroup when plus + overlay is clicked
    var addrbID = "add-"+rbgroup.attr("id");
    d3.select("#"+addrbID)
        .on("dblclick", (event) => { event.stopPropagation(); })
        .on("click", function() { add_rolebox(rbgroup); });

}

function rolebox_actions(rbox) {
    
    /* Rolebox events: right click, ctrl+click, overlay mousedown (new connector) */
    
    rbox
        .on("contextmenu", d3.contextMenu(roleboxOptions)) // Right click menu
        .on("click", remove_rolebox); // Ctrl+click --> remove rolebox
    // Events on rolebox overlay
    d3.select("#"+rbox.datum().overlay)
        .on("contextmenu", (event) => { event.stopPropagation(); }) // No right click menu
        .on("mousedown", rbomousedown ); // Initiate connector creation event
}

/* Remove rolebox */

function remove_rolebox(event,d) {

    /* Remove a rolebox on an event. */

    // Get rolebox
    // Note: d3.select(this) works for ctrl+click events but not right click menu
    var rboxID = event.target.id.toString().substring(2,event.target.length);
    rbox = orm.roleboxes[rboxID];
    if (rbox == null) { return }
    // Ctrl key for click event, buttons for right click menu
    if (event.ctrlKey || event.buttons == 2) {
        delete_rolebox( rbox );
    }
}

function delete_rolebox(rbox) {

    /* Delete the rolebox rbox.
       1. Only remove if last box
       2. Remove connectors from box
       3. Remove references to box
       4. Remove visualization
       5. Update ORM metamodel */

    // Get parent group of rolebox
    rbgroup = d3.select("#"+rbox.attr("parent"));
    gd = rbgroup.datum();

    // Only remove last added
    if ( rbox.attr("id") != gd.boxes[gd.boxes.length -1] && !gd.flipped ) { return }
    if ( rbox.attr("id") != gd.boxes[0] && gd.flipped ) { return }

    // Remove connectors
    //conns = gd.rbdata[rbox.attr("id")].connectors;
    conns = [...rbox.datum().connectors];
    for ( n in conns ) {
        // Delete the connectors
        delete_connector(orm.connectors[ conns[n] ]);
        // Remove connector reference from parent
        gd.connectors = remove_from_array( gd.connectors, conns[n] );
    }

    // Remove box reference from parent
    rboxID = rbox.attr("id");
    gd.boxes = remove_from_array( gd.boxes, rboxID );

    // Remove box reference from records
    delete orm.roleboxes[ rboxID ];

    // Remove the rolebox visualization
    rbox.remove();
    if (gd.flipped) { 
        // Adjust center of rolebox group to new left rolebox
        gd.dx += rb_param.width;
        gd.x = gd.x0 + gd.dx;
        move_rolebox_group(rbgroup);
        align_roleboxes(rbgroup); 
        // Unflip if only one box left
        if ( gd.boxes.length == 1 ) { flip_rolebox_group(rbgroup); }
    }
    set_rolebox_display_name(rbgroup);
    
    // Remove the rolebox from records
    var x = gd.x;
    var y = gd.y;
    if ( gd.boxes.length == 0 ) {
        // Remove group reference
        delete orm.rbgroups[ rbgroup.attr("id") ];
        // Remove group
        rbgroup.remove();
    } else {
        // For the new right-most box, update eligible overlays
        set_eligible_overlays_rolebox( gd.boxes[gd.boxes.length - 1] );
    }

    // If a popup related to this group is open, delete it.
    if ( ! d3.select("#pop-"+rbgroup.attr("id")).empty() ) { 
        remove_popup( d3.select("#pop-"+rbgroup.attr("id")) );
     }

    // Update ORM
    parse_orm();
}

function delete_fact(rbgroup) {

    // If a popup related to this group is open, delete it.
    if ( ! d3.select("#pop-"+rbgroup.attr("id")).empty() ) { 
        remove_popup( d3.select("#pop-"+rbgroup.attr("id")) );
    }

    // Remove reference to individual boxes
    var boxes = [...rbgroup.datum().boxes];
    for (var n in boxes ) { delete orm.roleboxes[ boxes[n] ]; }
    // Remove reference to rolebox group
    delete orm.rbgroups[ rbgroup.attr("id") ];

    // Delete connectors
    var conns = [...rbgroup.datum().connectors];
    for ( n in conns ) {
        // Delete the connectors
        delete_connector(orm.connectors[ conns[n] ]);
    }

    // Remove visualization
    var x = rbgroup.datum().xc; 
    var y = rbgroup.datum().yc; 
    rbgroup
        .transition()
        .duration(500)
        .attr("transform", "translate(" + x + "," + y + ") scale(0)")
        .remove();

    // Update ORM
    parse_orm();

}

/*-----  Drag control for the rolebox group -----*/

function rbdragstarted(event,d) {
    
    /* Initiate drag event */
    
    // Get the rolebox group on drag event
    d.selected = true;
    rbgroup = d3.select(this);

    // Ensure latest connector list at group level
    bubble_connectors(rbgroup);

}

function rbdragged(event,d,rbgroupID) {

    /* Drag event for rolebox group */

    // Set the new position
    d.dx += event.dx;
    d.dy += event.dy;

    // Snap to other objects
    /* Adding (d.xc-d.x) to set center of fact to real center rather than 
       center of 1st rolebox. */
    d.dx = snap( d.dx + d.x0 + (d.xc-d.x), "x", rbgroupID ) - d.x0 - (d.xc-d.x);
    d.dy = snap( d.dy + d.y0 + (d.yc-d.y), "y", rbgroupID ) - d.y0 - (d.yc-d.y);
    d.x = d.x0 + d.dx;
    d.y = d.y0 + d.dy;

    // Drag rolebox group
    // Groups must be moved using transform
    move_rolebox_group(rbgroup);

    // Check flip condition and redraw connected connectors
    check_flip_and_connectors(rbgroup);

    // Update rolebox datums
    set_rolebox_positions(rbgroup, d.x, d.y);
}

function move_rolebox_group(rbgroup) {
    
    // Groups must be moved using transform
    var d = rbgroup.datum();
    if (d.rotated) {
        rbgroup
            .attr("transform", () => translate_rotate(d.x,d.y,d.dx,d.dy));
    } else {
        rbgroup
            .attr("transform", () => translate(d.dx,d.dy));
    }
    
    // Record position for each rolebox
    // (We keep track of this during drag for snap events)
    set_rolebox_positions(rbgroup, d.x, d.y);
}

function set_rolebox_positions(rbgroup, x, y) {
    
    /* For each rolebox datum, set it's x and y
       based on rolebox group position. */
    
    var xval = 0;
    var gd = rbgroup.datum();
    for ( var n in gd.boxes ) {
        d = d3.select("#"+gd.boxes[n]).datum();
        if (gd.rotated) {
            yval = y + n * rb_param.width;
            xval = x;
        } else {
            xval = x + n * rb_param.width;
            yval = y;
        }
        d.x = xval;
        d.y = yval;
    }

    // Set the center of the fact
    set_central_fact_position(rbgroup);
}

function set_central_fact_position(rbgroup) {

    var d = rbgroup.datum();
    var shift = - 0.5 * rb_param.width + (d.boxes.length) * rb_param.width / 2;
    // Update central position of rbgroup
    if (d.rotated) {
        d.yc = d.y + shift;
        d.xc = d.x;
    } else {
        d.xc = d.x + shift;
        d.yc = d.y;
    }
}

function bubble_connectors(rbgroup) {
    
    /* Update the list of all connectors associated
       with the rolebox group (fact).
       
       (This is used at the start of dragging the 
       connector group and when adding new connectors.) */
    
    var n, d;
    var gd = rbgroup.datum();
    var connlist = [];
    for ( n in gd.boxes ) {
        d = d3.select("#"+gd.boxes[n]).datum();
        connlist.push.apply( connlist, d.connectors );
    }
    gd.connectors = connlist;
}

/*----- END Drag control for the rolebox group -----*/

/*----- On mouse down for the rolebox overlay circles -----*/

function rbomousedown(event) {

    /* First actions to perform on a mousedown event on an
       overlay of a rolebox.
       
       The big trick here is that the rolebox group is located
       at the origin, so we need to construct the actual location 
       of the rolebox and the click event. 
       
       (The better way to handle this may be to set the rbgroup location
        differently, but this will have a cascading impact on the
        drag events, so it should be handled in a separate PR.) */
    
    event.stopPropagation();

    // Get rolebox
    var boxID = d3.select(this).attr("rbox");
    var d = orm.roleboxes[boxID].datum();
    var gd = d3.select("#"+d.parent).datum();

    // current pointer position
    var m = d3.pointer(event);
    //var mousepos = {x: m[0], y: m[1]};
    // Event thinks the mouse is at the origin
    var mousepos = {x: m[0] + d.x - rb_param.width/2, 
                    y: m[1] + d.y - rb_param.height/2};
    if (gd.rotated) {
        mousepos = {y: m[0] - rb_param.width/2 + d.y,
                    x: -m[1] + rb_param.height/2 + d.x}
    }

    // Center of closest entity overlay
    var rbo = closest_rboverlay(mousepos, boxID);

    /* We're changing globals here. They get set back on mouseup (svg_mouseup).

       (The global dragevent sets which overlays we can connect to during the 
       mousemove event that creates a new connector. We restrict the
       available overlays so the rolebox connection point doesn't look 
       "weird" by ORM standards while we're dragging.) */
    dragevent.locations = ["top", "bottom"];
    if ( !dragevent.locations.includes(rbo.location) ) { 
        dragevent.locations = [ rbo.location ]; 
    } 

    // Create the initial connector line from center of overlay to
    // mouse position
    var conn = draw_conn_line(rbo.x, rbo.y, mousepos.x, mousepos.y);
    conn.datum().from = boxID;
    conn.datum().selected = true;

    // Add svg mouse actions for dragging connector across svg
    // We unset these on mouseup (svg_mouseup).
    svg
       .on("mousemove", function (event) { svg_mousemove(event, conn) })
       .on("mouseup", function (event) { svg_mouseup(event, conn) } );

}

function closest_rboverlay(pos,boxID,locations=dragevent.locations) {
    /* Get position of closest overlay of boxID to pos */
    // Get the overlay positions of the rolebox (not group!)
    var xyo = rboverlay_positions(boxID);
    // Get closest of the overlay positions
    return closest_location(pos,xyo,locations=locations)
}

function rboverlay_positions(boxID) {

    /* Create a set of positions for each overlay of rolebox boxID,
       based on its current position. */
    
    // Rolebox position
    var rbox = d3.select("#"+boxID);
    var gd = d3.select("#"+rbox.attr("parent")).datum();
    //var x = parseFloat( rbox.attr("x") ) + gd.dx;
    //var y = parseFloat( rbox.attr("y") ) + gd.dy;
    var x = rbox.datum().x;
    var y = rbox.datum().y;
    var xyoverlay = {
        "bottom" : { x: x,
                     y : y + rb_param.height/2, 
                     location : "bottom" },
        "right" : {x : x + rb_param.width/2,
                   y: y,
                   location : "right" },
        "top" : { x: x,
                  y: y - rb_param.height/2,
                  location : "top" },
        "left" : {x: x - rb_param.width/2,
                  y: y,
                  location : "left" }
    }
    
    if ( gd.rotated ) {
        xyoverlay = {
            "bottom" : { x: x - rb_param.height/2,
                         y : y, 
                         location : "bottom" },
            "right" : {x : x,
                       y: y + rb_param.width/2,
                       location : "right" },
            "top" : { x: x + rb_param.height/2,
                      y: y,
                      location : "top" },
            "left" : {x: x,
                      y: y - rb_param.width/2,
                      location : "left" }
        }
    }
    return xyoverlay;
}

function eligible_rolebox_locations(boxID,linkto="entity") {

    /* Eligible overlays for a connection line depend on:
       1. Position of rolebox in the rolebox group
       2. What object is connected to the rolebox. */

    var left_rb = ["bottom","top","left"];
    var right_rb = ["bottom","right","top"];
    var middle_rb = ["bottom","top"];
    var rblocations = { "left": left_rb, "right": right_rb, 
                        "middle": middle_rb, "only": dragevent.locations };

    var rbox = d3.select("#"+boxID);

    // What overlays can be used to link to rolebox?
    // Depends on object we are linking to (linkto)
    if ( linkto == "entity" || linkto == "value" ) {
        // Where is the rolebox in the list?
        // Eligible overlays based on rolebox position
        rbposition = rolebox_position(rbox);
        if ( rbposition.relative != null ) {
            return rblocations[ rbposition.relative ];
        } else { 
            return dragevent.locations;
        }
    }
}

function rolebox_position(rbox) {
    
    /* Where in the rbgroup chain is this rolebox?
       Possible values:
           relative: "left","middle","right"
           absolute: [index] */
    
    var position = { relative: null, absolute: null };
    var boxes = d3.select( "#"+rbox.datum().parent ).datum().boxes;
    var index = boxes.indexOf(rbox.attr("id"));
    if ( index == 0 && index == boxes.length -1 ) {
        position.relative = "only";
        position.absolute = index;
    } else if ( index == 0 ) {
        position.relative = "left";
        position.absolute = index;
    } else if ( index == boxes.length -1 ) {
        position.relative = "right";
        position.absolute = index;
    } else if ( index > 0 && index < boxes.length -1 ) {
        position.relative = "middle";
        position.absolute = index;
    }
    return position;

}

function set_eligible_overlays_rolebox(boxID) {
    
    /* When a rolebox is added or removed, update which overlays 
       are eligible to link to. */

    var conns = d3.select("#"+boxID).datum().connectors;
    for (var n in conns) {
        set_eligible_overlays( d3.select("#"+conns[n]) );
    }
}

/*----- END On mouse up for the rolebox overlay circles -----*/

/*----- END Rolebox actions -----*/