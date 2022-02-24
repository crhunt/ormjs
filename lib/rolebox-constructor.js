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
        //parse_orm();
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
            .attr("transform", () => translate(-rb_param.width, 0) );

        this.d3object = rbgroup;

        // Add an initial rolebox
        this.add_rolebox();

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
        //var rbox = draw_box(rbgroup);

        // Update central position of rbgroup
        //set_central_fact_position(rbgroup);
        this.set_fact_center();
        
        // Add rolebox actions
        //rolebox_actions( rbox );

        // Adjust text on group
        //set_rolebox_display_name(rbgroup);
        this.update_display_name();

        if ( d.boxes.length > 1 ) {
            // Update overlay connections for box to the left of new box
            var ind = 0;
            d.flipped ? ind = 1 : ind = d.boxes.length - 2;
            //set_eligible_overlays_rolebox( d.boxes[ind] );
            rbox.set_eligible_overlays();

            // Update orm
            //parse_orm();
        }

        // Redraw connectors
        //redraw_connectors(d.connectors);
        Connector.redraw(d.connectors);
        
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

    /*----- Predicate actions -----*/

    move() {
    
        // Groups must be moved using transform
        var d = this.d3object.datum();
        if (d.rotated) {
            this.d3object
                .attr("transform", () => translate_rotate(d.x,d.y,d.dx,d.dy));
        } else {
            this.d3object
                .attr("transform", () => translate(d.dx,d.dy));
        }
        
        // Record position for each rolebox
        // (We keep track of this during drag for snap events)
        //set_rolebox_positions(rbgroup, d.x, d.y);
        this.position_boxes();
    
        // Check flip condition and redraw connected connectors
        //check_flip_and_connectors(rbgroup);
        this.update_flip();
    }

    position_boxes() {

        /*  For each rolebox datum, set it's x and y
            based on rolebox group position. */

        var gd = this.d3object.datum();

        for (var n in gd.boxes) {
            d = d3.select(`#${gd.boxes[n]}`).datum();
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

    // Flipping

    update_flip() {

        /*  Check flip condition. If flip = true, then
            flip the rolebox group.
            
            Redraw all connected connectors. */
        
        // Check flip condition
        var d = rbgroup.datum();
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
        //align_roleboxes(rbgroup);
        this.align();
        // Update display name
        //set_rolebox_display_name(rbgroup);
        this.update_display_name();
        
        // Redraw all connected connectors
        //redraw_connectors(gd.connectors);
        Connector.redraw(gd.connectors);
    }

    align() {

        /*  Move each rolebox (group, rect, and overlay)
            based on group position.*/

        var gd = this.d3object.datum();

        var x = gd.x0;
        var y = gd.y0;
        for (var n in gd.boxes) {
            //move_rolebox(d3.select( "#"+gd.boxes[n] ),x,y);
            orm.roleboxes[gd.boxes[n]].move(x,y);
            // Set eligible overlays for connectors
            //set_eligible_overlays_rolebox(gd.boxes[n]);
            orm.roleboxes[gd.boxes[n]].set_eligible_overlays();
            x += rb_param.width;
        }
        // Update position data in roleboxes
        //set_rolebox_positions(rbgroup, gd.x, gd.y);
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

    /*----- END Predicate actions -----*/

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
            this.add_overlay();

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
        //parse_orm();
    }

    create_d3object(data) {
        var rbox = Rolebox.draw_box(data);
        this.id = rbox.attr("id");
        this.d3object = rbox;
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
            //move_rolebox_group(rbgroup);
            data.predicate.move();
            //align_roleboxes(rbgroup); 
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
        var overlay = overlay_definition(this.d3object, "rboverlay");
        overlay.attr("rbox", this.id );
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

    move(x,y) {
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
        var height = parseInt( 1.5*rbox.attr("height") );
        d3.select("#"+oID)
            .attr("transform", () => overlay_translate(x,y,width,height) );
    }

    /*----- END Rolebox actions -----*/

    /* Connections */

    set_eligible_overlays() {

        /*  When a rolebox is added or removed, update which overlays 
            are eligible to link to. */

        var conns = d3.select(`#${this.id}`).datum().connectors;
        conns.map( (connID) => {
            orm.connectors[connID].set_eligible_overlays();
        });

    }
}