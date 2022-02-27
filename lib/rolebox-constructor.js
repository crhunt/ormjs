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
    width : GraphUtils.get_css_number('--rolebox-width'),
    height : GraphUtils.get_css_number('--rolebox-height') ,
    snapTolerance : GraphUtils.get_css_number('--rolebox-width')/10
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

class Predicate {
    d3object;
    id;
    kind = "rolebox_group";
    ref = "rbgroups";

    constructor(data) {
        if(!data.d3object) {
            // Create new d3 object
            this.id = Predicate.generateID();
            this.create_d3object(data);

        } else {
            // Create new constraint object with provided d3 object
            this.id = data.d3object.attr("id");
            data.d3object.datum().id = this.id;
            this.d3object = data.d3object;
        }

        // Record object
        this.record();

        // Update ORM
        parse_orm();
    }

    /*----- Predicate IDs -----*/
    
    static generateID() {
        /* ID of the rolebox group (which defines a predicate) */
        var rbID = "id-rolebox-" + orm.highestRBID.toString();
        orm.highestRBID += 1;
        return rbID
    }

    static is_roleboxID(anyID) {
        /* Does anyID play any part in a rolebox group? 
           (Returns true for boxes, text, etc as well as rolebox group) */
        if ( anyID.includes("rolebox") ) { return true; }
        return false;
    }

    /*----- END Predicate IDs -----*/

    /*-----  Drawing predicates -----*/

    create_d3object(data) {

        /*  Define the fact (rolebox group) appearance (its display name and
            overlay) and initialize its datum. */

        // Datum
        var def_d = Predicate.default_datum();
        var d = Graph.fill_datum(data, def_d);
        d.x0 = d.x; d.xc = d.x;
        d.y0 = d.y; d.yc = d.y;
        d.id = this.id;

        var rbgroup = svg.append("g")
            .datum( d )
            .attr("id", this.id)
            .attr("class", "rolebox_group")
            .attr("x", -rb_param.width/2 )
            .attr("y", -rb_param.height/2 );

        // Append name of fact
        rbgroup
            .append("text")
            .attr("class","rbname")
            .attr("id","t-"+this.id)
            .attr("x", function(d){ return (d.x0) })
            .attr("y", function(d){ return (d.y0 - 1.5*rb_param.height) })
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "center")
            //.attr("pointer-events", "none")
            .text( function(d){ return d.name } );

        // Add overlay used for adding roleboxes to the group
        var osize = rb_param.height;
        rbgroup
            .append("path")
            .attr("d", function(d) { return Predicate.plusPath(d,osize) } )
            .attr("class","rbadd")
            .attr("id", "add-"+this.id)
            .attr("transform", () => Graph.translate(-rb_param.width, 0) );

        this.d3object = rbgroup;

        // Add an initial rolebox
        this.add_rolebox();

        // Add actions
        this.actions();

    }

    static plusPath(position, size) {

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

    add_rolebox() {
        /*  Add a rolebox to the fact rbgroup. This includes:
            1. The rolebox appearance and datum
            2. Adding rolebox information to rbgroup datum,
               updating display name
            3. Rolebox overlays
            4. Rolebox actions
            5. Updating where all connectors connect to the rbgroup 
        */

        // Data related to identifying new rolebox
        var d = this.d3object.datum();

        // Add box
        var rbox = new Rolebox({predicate: this});

        // Update central position of rbgroup
        this.set_fact_center();
        
        // Add rolebox actions
        rbox.actions();

        // Adjust text on group
        this.update_display_name();

        if ( d.boxes.length > 1 ) {
            // Update overlay connections for box to the left of new box
            var ind = 0;
            d.flipped ? ind = 1 : ind = d.boxes.length - 2;
            orm.roleboxes[d.boxes[ind]].set_eligible_overlays();

            // Update orm
            parse_orm();
        }

        // Redraw connectors
        Connector.redraw(d.connectors);

        return rbox
        
    }

    duplicate() {
        // Data about original fact
        var gd = this.d3object.datum();

        var offset = rb_param.height*0.75;
        var x = gd.x + offset;
        var y = gd.y + offset;
        
        // Duplicate fact
        var predcopy = new Predicate({x: x, y: y})
        var gdc = predcopy.d3object.datum();

        // Duplicate roleboxes
        var boxes = [...gd.boxes];
        if (gd.flipped) { boxes.reverse(); }
        orm.roleboxes[ boxes[0] ].duplicate( orm.roleboxes[ gdc.boxes[0] ] );
        var rng = GraphUtils.range(boxes.length-1,1);
        for ( var n in rng ) {
            var rbox = predcopy.add_rolebox();
            orm.roleboxes[ boxes[rng[n]] ].duplicate(rbox);
        }

        // Set fact data to match
        gdc.name = gd.name;
        gdc.rname = gd.rname;
        // Set the fact visualization to match data
        predcopy.update_display_name();

        // Update orm
        parse_orm();
    }

    // Data

    static default_datum() {
        var param = {x: 0, y: 0, dx: 0, dy: 0, x0: 0, y0: 0,
                    xc: 0, yc: 0, // Central position of fact vs center of 1st box for x,y
                    selected: false, 
                    kind: "rolebox_group",
                    name : "", rname : "",
                    entity_in: null, 
                    mandatory: false,
                    boxes: [], 
                    connectors: [],
                    flipped: false, rotated: false, arrow: false}
        return param
    }

    record() {
        // Add new entity to global record
        orm.rbgroups[this.id] = this;
    }

    update_display_name() {

        /* This is used to read the names of each box in the rolebox group and
           combine them into a total display name. The final name is centered
           based on the total size of the group. */
        
        var gd = this.d3object.datum();
        var boxcount = gd.boxes.length;

        // Get all names of boxes
        var boxnames = this.namelist();
        gd.name = boxnames.reduced.join(" ... ");
        gd.name = gd.name.trim();
        var display_name = gd.name;
        // Add arrow when flipped
        // 🞀 &#128896;
        gd.arrow ? display_name = "🞀 " + gd.name : display_name = gd.name;
        // Add reverse name
        gd.rname = Rolebox.format_name(gd.rname);
        if ( gd.rname.length > 0 ) { display_name += " / " + gd.rname; }
        // Set text field value and position
        d3.select(`#t-${this.id}`)
            .text(display_name)
            .attr("x", function() { 
                return (gd.x0 + (boxcount-1) * rb_param.width/2) 
            });
    }

    namelist() {
        // Get all names in a list, rbname
        var gd = this.d3object.datum();
        var boxes = [...gd.boxes];
        if (gd.flipped == true) { boxes = boxes.reverse(); }
        var rbname = boxes.map( (boxID) => {
            // Get name and format
            var d = d3.select(`#${boxID}`).datum();
            d.name = Rolebox.format_name(d.name);
            // Push name to list
            return d.name;
        });
        var nlist = [ rbname.slice(0,2).join(" ") ];
        nlist.push.apply(nlist, rbname.slice(2,rbname.length));

        return {all: rbname, reduced: nlist}
    }

    /*----- END Predicate drawing -----*/

    /*----- Predicate actions -----*/

    move() {
    
        // Groups must be moved using transform
        var d = this.d3object.datum();
        if (d.rotated) {
            this.d3object
                .attr("transform", () => Graph.translate_rotate(d.x,d.y,d.dx,d.dy));
        } else {
            this.d3object
                .attr("transform", () => Graph.translate(d.dx,d.dy));
        }
        
        // Record position for each rolebox
        // (We keep track of this during drag for snap events)
        this.position_boxes();
    
        // Check flip condition and redraw connected connectors
        this.update_flip();
    }

    actions() {

        /*  What to do with a fact (rolebox group) on drag event, 
            double click event, or plus overlay click event. */

        // Drag rolebox group
        var drag_predicate = d3.drag()
            .on("start", this.dragstarted)
            .on("drag", this.dragged )
            .on("end", this.dragended);

        // Double click: open popup
        this.d3object
            .on("dblclick", popup_event)
            .call(drag_predicate);

        // Add rolebox to rbgroup when plus + overlay is clicked
        d3.select("#"+`add-${this.id}`)
            .on("dblclick", (event) => { event.stopPropagation(); })
            .on("click", function(event) {
                var predID = Graph.get_parentID( event.target.id.toString() );
                orm.rbgroups[predID].add_rolebox(); 
            });

    }

    dragstarted(event,d) {
        // Initiate drag event
        var rbgroup = orm.rbgroups[d.id];
        Graph.dragstarted(event,d,rbgroup);
        // Ensure latest connector list at group level
        rbgroup.bubble_connectors();
    }

    dragged(event,d) {
        // Drag predicate
        var rbgroup = orm.rbgroups[d.id];
        Graph.dragged(event,d,rbgroup);
    }

    dragended(event,d) {
        // End drag
        var rbgroup = orm.rbgroups[d.id];
        Graph.dragended(rbgroup);
    }

    // Auxillary

    position_boxes() {

        /*  For each rolebox datum, set it's x and y
            based on rolebox group position. */

        var gd = this.d3object.datum();

        for (var n in gd.boxes) {
            var d = d3.select(`#${gd.boxes[n]}`).datum();
            if (gd.rotated) {
                d.y = gd.y + n * rb_param.width;
                d.x = gd.x;
            } else {
                d.x = gd.x + n * rb_param.width;
                d.y = gd.y;
            }
        }

        // Set the center of the fact
        this.set_fact_center();

    }

    set_fact_center() {

        // set_central_fact_position

        var d = this.d3object.datum();
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

    bubble_connectors() {
    
        /* Update the list of all connectors associated
           with the rolebox group (fact).
           
           (This is used at the start of dragging the 
           connector group and when adding new connectors.) */
        
        var n, d;
        var gd = this.d3object.datum();
        var connlist = [];

        var connlist = gd.boxes.map( (boxID) => {
            var d = d3.select(`#${boxID}`).datum();
            return [...d.connectors]
        }).flat().filter(v => v);

        gd.connectors = connlist;
    }

    // Flipping

    update_flip() {

        /*  Check flip condition. If flip = true, then
            flip the rolebox group.
            
            Redraw all connected connectors. */
        
        // Check flip condition
        var d = this.d3object.datum();
        var flipit = this.check_flip_condition();
        if (flipit.flip) {
            this.flip();
        }

        // Redraw all connected connectors 
        // (regardless of whether flipped)
        Connector.redraw(d.connectors);

    }

    flip() {
    
        /* Flip the rolebox order of a group of roleboxes */
    
        // Set flip in datum
        var gd = this.d3object.datum();
        gd.flipped ? gd.flipped = false : gd.flipped = true;
        gd.arrow = gd.flipped; // Show arrow if flipped (different from NORMA convention)
    
        // Reorder boxes in datum
        gd.boxes = gd.boxes.reverse();
    
        // Move each rolebox (group, rect, and overlay)
        this.align();
        // Update display name
        this.update_display_name();
        
        // Redraw all connected connectors
        Connector.redraw(gd.connectors);
    }

    align() {

        /*  Move each rolebox (group, rect, and overlay)
            based on group position.*/

        var gd = this.d3object.datum();

        var x = gd.x0;
        var y = gd.y0;
        for (var n in gd.boxes) {
            orm.roleboxes[gd.boxes[n]].move(x,y);
            // Set eligible overlays for connectors
            orm.roleboxes[gd.boxes[n]].set_eligible_overlays();
            x += rb_param.width;
        }
        // Update position data in roleboxes
        this.position_boxes();

    }

    check_flip_condition() {
        /*  Based on the rolebox group's position, determine whether or not to flip
            the rolebox.

            This function does *not* perform the actual flipping. Just decides
            whether or not to do it. Flip performed by flip().

            This function is more complicated than it needs to be because it also 
            decides whether to display an arrow according to the NORMA standard,
            which ORMJS does not currently follow!
        */
            
        var gd = this.d3object.datum();
        var flipit = { flip: false, arrow: gd.arrow };

        // If not connected to an entity, do nothing
        if ( gd.entity_in == null ) { return flipit }
        // If single box, do nothing
        if ( gd.boxes.length == 1 ) { return flipit }

        // Get the entity's position information
        var ed = d3.select("#"+gd.entity_in).datum();

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

    // Rotate

    rotate() {
    
        /* Flip the value of rotate in the datum and update the
           visualization of the fact (rbgroup) to align with datum. */
    
        // Flip rotate value in datum
        var d = this.d3object.datum();
        d.rotated = !d.rotated;
    
        // Apply rotate
        if ( d.rotated ) {
            this.d3object
                .attr("transform", () => Graph.translate_rotate(d.x,d.y,d.dx,d.dy));
        } else {
            this.d3object
                .attr("transform", () => Graph.translate(d.dx,d.dy));
        }
        
        // Update position data in roleboxes
        this.position_boxes();
    
        // Check flip condition and redraw connected connectors
        this.update_flip();
    }

    /*----- END Predicate actions -----*/

    /*----- Predicate delete -----*/

    delete() {
        // Remove reference to individual boxes
        var boxes = [...this.d3object.datum().boxes];
        // Delete object
        Graph.delete_object(this);
        for (var n in boxes ) { delete orm.roleboxes[ boxes[n] ]; }
    }

    /*----- END Predicate delete -----*/

    /* Connections */

    set_subject() {

        /*  This is the entity that connects to the first rolebox.
            Set this entity in the datum of the rolebox group.
            
            The primary entity is used to decide when to auto-flip 
            the rolebox group. 
        */

       var gd = this.d3object.datum();
       var ind = 0;
       var boxes = gd.boxes;
       gd.flipped ? ind = boxes.length - 1 : ind = 0;
       gd.entity_in = d3.select("#"+boxes[ind]).datum().entity;
    }

}

class Rolebox {

    d3object;
    id;
    parent;
    kind = "rolebox";
    ref = "roleboxes";

    constructor(data) {

        if(!data.d3object) {
            // Create new d3 object
            this.parent = data.predicate.id;
            this.create_d3object(data);

        } else {
            // Create new object with provided d3 object
            this.id = data.d3object.attr("id");
            this.parent = data.d3object.datum().parent;
            data.d3object.datum().id = this.id;
            this.d3object = data.d3object;
        }

        // Record object
        this.record();

        // Update ORM
        parse_orm();
    }

    create_d3object(data) {
        var rbox = Rolebox.draw_box(data);
        this.id = rbox.attr("id");
        this.d3object = rbox;
        this.add_overlay();
        return rbox
    }

    static draw_box(data) {

        /* 1. Add a new rolebox to the predicate.
           2. Define the rolebox appearance (box and overlays) 
              and initialize its datum. 
           3. Add information
              about the box to the parent rbgroup. */
    
        // Data related to identifying new rolebox
        var rbgroup = data.predicate.d3object;
        var d = rbgroup.datum();
        var boxcount = d.boxes.length;
        var rbID = rbgroup.attr("id");
        var boxID = "r-" + boxcount.toString() + "-" + rbID;
        var rbname = "rolebox " + boxcount.toString() ;

        // Datum
        var def_d = Rolebox.default_datum();
        var data_d = { x : d.x + boxcount * rb_param.width, y : d.y,
                       dx : boxcount * rb_param.width,
                       name : rbname,
                       parent: rbID };
        def_d = { ...data_d, ...def_d };
        var bd = Graph.fill_datum(data, def_d);
        
        // Rolebox visualization
        rbgroup.append("g")
               .datum( bd )
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
                    .attr("transform", () => Graph.translate(-rb_param.width/2 , -rb_param.height/2));
        
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
            data.predicate.move();
            data.predicate.align();
        } else {
            // Add box to end of list
            d.boxes.push(boxID);
        }
    
        var rbox = d3.select("#"+boxID);
    
        // Initialize uniqueness constraint
        rbox
            .append("path")
            .attr("d", "" ) // Default no IUC
            .attr("class","rb_constraint")
            .attr("id", `c-${boxID}`);
    
        return rbox
    }

    add_overlay() {
        // Add rolebox overlay
        var overlay = Graph.draw_overlay(this.d3object, "rboverlay");
        overlay.attr("rbox", this.id );
    }

    duplicate(targetbox) {
        // Match datum 
        targetbox.d3object.datum().name = this.d3object.datum().name;
        targetbox.d3object.datum().multiplicity = this.d3object.datum().multiplicity;
        // Set box visualization to match data
        targetbox.set_internal_uc();
    }

    set_internal_uc() {
        /*  Change the rolebox uniqueness constraint visualization
            based on datum value. */

        Rolebox.set_rolebox_iuc(this.d3object);
    }

    static set_rolebox_iuc(d3object) {

        // Static function used by object property menu

        var gd = d3.select("#"+d3object.datum().parent).datum();
        var d = d3object.datum();
        // Position of box wrt when rbgroup was created
        var pos = {x:gd.x0 + d.x - gd.x, y:gd.y0}; 
        // Possible uniqueness constraints
        var uconstraints = {};
        uconstraints[ mult_param.none ] = function() { return "" };
        uconstraints[ mult_param.many ] = many_box;
        uconstraints[ mult_param.one ] = unique_box;
        uconstraints[ mult_param.skip ] = skip_box;

        d3.select("#c-"+d3object.attr("id"))
            .attr("d", () => uconstraints[d.multiplicity]({x: 0, y:0}) )
            .attr("transform", () => Graph.translate(pos.x,pos.y));
    }

    // Data

    static default_datum() {
        return {kind : "rolebox",
                multiplicity: mult_param.none,
                entity: null, 
                mandatory: false,
                connectors : [],
                selected : false }
    }

    record() {
        // Add new entity to global record
        orm.roleboxes[this.id] = this;
    }

    static format_name(rbname) {
        // Format name appearance
        return rbname.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toLowerCase()).trim();
    }

    /*----- Rolebox actions -----*/

    actions() {
    
        /* Rolebox events: right click, ctrl+click, overlay mousedown (new connector) */
        
        this.d3object
            .on("contextmenu", d3.contextMenu(roleboxOptions)) // Right click menu
            .on("click", this.remove); // Ctrl+click --> remove rolebox
        // Events on rolebox overlay
        d3.select(`#o-${this.id}`)
            .on("contextmenu", (event) => { event.stopPropagation(); }) // No right click menu
            .on("mousedown", (event) => { this.mousedown(event, this); } ); // Initiate connector creation event
    }

    move(x,y) {
        /* Move rolebox to position x,y.
           (Might want to reconsider how we do this.) */

        // Move the group
        this.d3object
            .attr("x", x)
            .attr("y", y);
        // Move the rect
        d3.select("#r-"+this.id)
            .attr("x", x)
            .attr("y", y);
        // Move the uniqueness constraint
        d3.select("#c-"+this.id)
            .attr("transform", () => Graph.translate(x,y) );
        // Move the overlays
        var width = parseInt( this.d3object.attr("width") );
        var height = parseInt( 1.5*this.d3object.attr("height") );
        d3.select(`#o-${this.id}`)
            .attr("transform", () => Graph.overlay_translate(x,y,width,height) );
    }

    mousedown(event, rbox) {
        /*  First actions to perform on a mousedown event on an
            overlay of a rolebox.
            
            The big trick here is that the rolebox group is located
            at the origin, so we need to construct the actual location 
            of the rolebox and the click event. 
            
            (The better way to handle this may be to set the rbgroup location
             differently, but this will have a cascading impact on the
             drag events, so it should be handled in a separate PR.) 
        */

        var gd = d3.select(`#${rbox.d3object.datum().parent}`).datum();
        var d = rbox.d3object.datum();
        // current pointer position
        var m = d3.pointer(event);
        // Event thinks the mouse is at the origin
        var mousepos = {x: m[0] + d.x - rb_param.width/2, 
                        y: m[1] + d.y - rb_param.height/2};
        if (gd.rotated) {
            mousepos = {y: m[0] - rb_param.width/2 + d.y,
                        x: -m[1] + rb_param.height/2 + d.x}
        }

        Graph.mousedown(event, rbox, mousepos);
    }

    // Mandatory

    flip_mandatory() {

        /* If mandatory role is true, set to false. If false, set to true.
           Change visual to reflect the new mandatory/not status of the role. */
    
        var d = this.d3object.datum();
        if (d.entity == null) { return }
        d.mandatory ? d.mandatory = false : d.mandatory = true;
        for (var n in d.connectors ) {
            if ( d3.select("#"+d.connectors[n]).datum().conntype == conntypes.EtoRB ||
                 d3.select("#"+d.connectors[n]).datum().conntype == conntypes.VtoRB ) {
                 d3.select("#"+d.connectors[n]).datum().mandatory = d.mandatory;
                //var conn = d3.select("#"+d.connectors[n]);
                var conn = orm.connectors[d.connectors[n]];
            }
        }
        // Redraw all connected connectors
        conn.update_location();
    
        // Set independence of entity/value to false
        if (d.mandatory) {
            var obj = d3.select("#"+d.entity);
            obj.datum().independent = false;
            //update_name(obj);
            Graph.any_object(d.entity).update_display_name();
        }
    
        // Update ORM
        parse_orm();
    }

    /*----- END Rolebox actions -----*/

    /*----- Rolebox delete -----*/

    remove(event,d) {

        /* Remove a rolebox on an event. */
    
        // Get rolebox
        // Note: d3.select(this) works for ctrl+click events but not right click menu
        var rboxID = Graph.levelupID( event.target.id.toString() );
        var rbox = orm.roleboxes[rboxID];
        if (rbox == null) { return }
        // Ctrl key for click event, buttons for right click menu
        if (event.ctrlKey || event.buttons == 2) {
            rbox.delete();
        }
    }

    delete() {
        /* Delete the rolebox rbox.
            1. Only remove if last box
            2. Remove connectors from box
            3. Remove references to box
            4. Remove visualization
            5. Update ORM metamodel */

        // Get parent group of rolebox
        var rbgroup = orm.rbgroups[ this.parent ];
        var gd = rbgroup.d3object.datum();

        // Only remove last added
        if ( this.id != gd.boxes[gd.boxes.length -1] && !gd.flipped ) { return }
        if ( this.id != gd.boxes[0] && gd.flipped ) { return }
        if ( gd.boxes.length == 1 ) {
            rbgroup.delete();
            return
        }

        // Remove connectors
        var conns = [...this.d3object.datum().connectors];
        conns.map( (connID) => {
            // Remove connector reference from parent
            gd.connectors = GraphUtils.remove_from_array( gd.connectors, connID );
            // Delete the connector
            orm.connectors[connID].delete();
        });

        // Remove box reference from parent
        gd.boxes = GraphUtils.remove_from_array( gd.boxes, this.id );

        // Remove box reference from records
        delete orm.roleboxes[ this.id ];

        // Remove the rolebox visualization
        this.d3object.remove();
        if (gd.flipped) { 
            // Adjust center of rolebox group to new left rolebox
            gd.dx += rb_param.width;
            gd.x = gd.x0 + gd.dx;
            rbgroup.move();
            rbgroup.align();
            // Unflip if only one box left
            if ( gd.boxes.length == 1 ) { rbgroup.flip(); }
        }
        rbgroup.update_display_name();
        
        // For the new right-most box, update eligible overlays
        orm.roleboxes[ gd.boxes[gd.boxes.length-1] ].set_eligible_overlays();
        rbgroup.set_fact_center();

        // If a popup related to this group is open, delete it.
        if ( ! d3.select("#pop-"+rbgroup.id).empty() ) { 
            remove_popup( d3.select("#pop-"+rbgroup.id) );
        }

        // Update ORM
        parse_orm();
    }

    /*----- END Rolebox delete -----*/

    /*----- Rolebox connections -----*/

    closest_overlay(pos,locations=dragevent.locations) {
        /* Get position of closest overlay of boxID to pos */
        // Get the overlay positions of the rolebox (not group!)
        var xyo = this.overlay_positions();
        // Get closest of the overlay positions
        return Graph.closest_location(pos,xyo,locations=locations)
    }

    overlay_positions() {
        var parentID = this.d3object.datum().parent;
        var gd = d3.select(`#${parentID}`).datum();
        var xyoverlay = {};
        gd.rotated ? xyoverlay = Graph.rotated_overlay_positions(this)
                   : xyoverlay = Graph.overlay_positions(this);
        return xyoverlay
    }

    set_eligible_overlays() {

        /*  When a rolebox is added or removed, update which overlays 
            are eligible to link to. */

        var conns = d3.select(`#${this.id}`).datum().connectors;
        conns.map( (connID) => {
            orm.connectors[connID].set_eligible_overlays();
        });

    }

    bubble_connectors() {
        // propagate_connection_data
        // Set role player
        this.set_role_player();
        // Set connectors at the group level
        orm.rbgroups[this.parent].bubble_connectors();
        orm.rbgroups[this.parent].set_subject();
    }

    set_role_player() {
        //  Set the entity that connects to the rolebox.
        var connectors = this.d3object.datum().connectors;
        this.d3object.datum().entity = null;
        connectors.map( (connID) => {
            var obj = d3.select("#" + d3.select("#"+connID).datum().from );
            if( obj.datum().kind == "entity" || obj.datum().kind == "value" ) { 
                this.d3object.datum().entity = obj.attr("id"); 
            }
        });
    }

    eligible_locations(linkto="entity", loc=dragevent.locations) {

        /* Eligible overlays for a connection line depend on:
           1. Position of rolebox in the rolebox group
           2. What object is connected to the rolebox. 
            
           A bit long as there's ORM logic encoded here.

           eligible_rolebox_locations
        */
    
        var left_rb = ["bottom","top","left"];
        var right_rb = ["bottom","right","top"];
        var middle_rb = ["bottom","top"];
        var rblocations = { "left": left_rb, "right": right_rb, 
                            "middle": middle_rb, "only": dragevent.locations };
    
        //var rbox = d3.select("#"+boxID);
        //var rbposition = rolebox_position(rbox);
        var rbposition = this.position();
    
        // What overlays can be used to link to rolebox?
        // Depends on object we are linking to (linkto)
        if ( linkto == "entity" || linkto == "value" ) {
            // Where is the rolebox in the list?
            // Eligible overlays based on rolebox position
            if ( rbposition.relative != null ) {
                return rblocations[ rbposition.relative ];
            } else { 
                return loc;
            }
        }
    
        if (linkto == "constraint") {
            var bestloc = loc.dragevent;
            if (bestloc.length > 2) {
                // Check intention from closest overlay
                var options = { "left": ["left"], "right": ["right"], 
                                "top": ["top", "bottom"], "bottom": ["top", "bottom"] };
                bestloc = options[ loc.closest ];
            }
            // Confirm rolebox position allows choice
            if( (rbposition.relative == "left" && bestloc.includes("left")) ||
                (rbposition.relative == "right" && bestloc.includes("right")) ||
                (rbposition.relative == "only") ) {
                return ["top", "bottom"];
            }
            return bestloc
        }
        return loc
    }

    position() {
        /* Where in the rbgroup chain is this rolebox?
           Possible values:
                relative: "left","middle","right"
                absolute: [index] */
    
        var boxes = d3.select( "#"+this.parent ).datum().boxes;
        var index = boxes.indexOf(this.id);
        var position = { relative: null, absolute: index, number: boxes.length };
        if ( index == 0 && index == boxes.length -1 ) {
            position.relative = "only";
        } else if ( index == 0 ) {
            position.relative = "left";
        } else if ( index == boxes.length -1 ) {
            position.relative = "right";
        } else if ( index > 0 && index < boxes.length -1 ) {
            position.relative = "middle";
        }
        return position;
    }

    entity_connector() {
        // Which connector connects to an entity?

        var connlist = this.d3object.datum().connectors;
        for (var n in connlist) {
            var cd = orm.connectors[connlist[n]].d3object.datum();
            if ( cd.conntype == conntypes.EtoRB ||
                cd.conntype == conntypes.VtoRB ) { return connlist[n] }
        }
        return null
    }

    /*----- END Rolebox connections -----*/
}