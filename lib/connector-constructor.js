/*
    Everything related to connectors.

    Connectors are the lines that join Entities, Roleboxes, Values, and Constraints.
    They also include constraints represented by connections, like Subtype, since
    their actions are the same.

*/

/*----- Global definitions -----*/

var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg
var dragevent; // Defined in graph-constructor

/* Set all supported types of connections. This information is used to
   to determine how and whether objects can connect. */
var conntypes = {
    subtype: "subtype",
    default: "default",
    EtoRB: "EtoRB",
    VtoRB: "VtoRB",
    CtoRB: "CtoRB",
    CtoS: "CtoS"
};

var connclass = {
    subtype: "subtype",
    default: "line",
    EtoRB: "line",
    VtoRB: "line",
    mandatory: "line",
    CtoRB: "constraint",
    CtoS: "constraint"
}

/*----- END Global definitions -----*/

class Connector {

    d3object;
    id;

    constructor(data) {
        
        if(!data.d3object) {
            this.id = Connector.generateID();
            this.create_d3object(data);

        } else {
            this.id = data.d3object.attr("id");
            this.d3object = data.d3object;
        }
    }

    static generateID() {
        var connID = "id-conn-" + orm.highestConnID.toString();
        orm.highestConnID += 1;
        return connID
    }

    static find(from_id, to_id) {
        var connlist = d3.select("#"+to_id).datum().connectors;
        for (var n in connlist) {
            if ( orm.connectors[connlist[n]].d3object.datum().from == from_id ) { 
                return connlist[n] 
            }
        }
        return null
    }

    static redraw(conns) {
        conns.map( (connID) => {
            // Update conn location
            orm.connectors[connID].update_location();
            // Update location of conns connected to subtype
            if ( orm.connectors[connID].d3object.datum().conntype == conntypes.subtype ) {
                var moreconns = orm.connectors[connID].d3object.datum().connectors;
                moreconns.map( (moreconnID) => {
                    orm.connectors[moreconnID].update_location();
                });
            }
        });
    }

    static connect_by_id(aID, bID) {
        // Let locations of each object (...not actually necessary)
        var obja = d3.select("#"+aID);
        var objb = d3.select("#"+bID);
        var data = { x1: obja.datum().x, y1: obja.datum().y,
                     x2: objb.datum().x, y2: objb.datum().y };
        // Create connector
        var conn = new Connector(data);
        // Assign objects to connector
        var cd = conn.d3object.datum();
        cd.from = aID;
        cd.to = bID;
        // Connect!
        conn.connect();

        return conn
    }

    create_d3object(pos) {

        var conntype = conntypes.default;
        if (pos.conntype) { conntype = pos.conntype; }
        
        // Draw the connector
        var connector = svg.append("g")
            .datum( { x1: pos.x1, y1: pos.y1, x2: pos.x2, y2: pos.y2, 
                kind: "connector", selected: false,
                conntype: conntype, preferred: false,
                mandatory: false, directed:false,
                from: "", to: "", 
                connectors: [], // Only for subtypes
                from_loc: dragevent.all_locations,
                to_loc: dragevent.all_locations } )
            .attr("class", "connector_prototype")
            .attr("id",this.id);

        connector.append("path")
            .attr("class", "connector "+connclass[conntype])
            .attr("id","p-"+this.id)
            .attr("d", d3.line()([ [pos.x1,pos.y1], [pos.x2,pos.y2] ]));
        
        connector.append("path")
            .attr("class", "connector clear")
            .attr("id","o-"+this.id)
            .attr("d", d3.line()([ [pos.x1,pos.y1], [pos.x2,pos.y2] ]));

        this.d3object = connector;

        // Add actions for the connector.
        this.actions();
    }

    paths() {
        var nodelist = [...this.d3object._groups[0][0].childNodes];
        return nodelist.map( (n) => { return n.id })
    }

    draw() {
        
        /*
            Based on the conntype of the connection, set the style of
            the connector and draw it. 

            This is where we set what the connector actually looks like
            (simple line vs arrow, color, etc).

            The paths referenced here are defined in connector-paths.js
        */

        // d3object
        var conn = this.d3object;
        // Paths
        var connpath = d3.select(`#p-${this.id}`);
        var connover = d3.select(`#o-${this.id}`);

        
        // Retain notparsed class information
        var np;
        conn.attr("class").includes("notparsed") ? np = " notparsed" : np = "";

        // Get line parameters
        var cd = conn.datum();
        var lineparam = resize_and_rotate(cd);

        if ( cd.conntype == conntypes.default ) {
            connpath.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]))
                    .attr("class",`connector ${connclass.default}${np}`);
            connover.attr("d", null);
        }
        // Connect to constraint
        else if ( cd.conntype == conntypes.CtoRB || cd.conntype == conntypes.CtoS ) {
            var type = d3.select(`#${cd.from}`).datum().type;
            var draw_arrows = ["subset"];
            if ( draw_arrows.includes(type) && cd.directed ) {
                connpath.attr("d", function() { return linePathArrow(lineparam.length) })
                        .attr("class",`connector ${connclass.CtoRB}${np}`);
                connover.attr("d", function() { return constraintArrowPath(lineparam.length) })
                        .attr("class",`connector clear arrow${np}`);
                conn
                    .attr("transform", lineparam.transform );
            } 
            else if ( cd.to == "" || cd.from == "" ) {
                connpath.attr("d", function() { return linePath(lineparam.length) })
                        .attr("class",`connector ${connclass.CtoRB}${np}`);
                connover.attr("d", function() { return linePath(lineparam.length) })
                        .attr("class",`connector clear${np}`);
                conn
                    .attr("transform", lineparam.transform );
            }
            else {
                connpath.attr("d", function() { return linePath(lineparam.length) })
                        .attr("class",`connector ${connclass.CtoRB} connected${np}`);
                connover.attr("d", function() { return linePath(lineparam.length) })
                        .attr("class",`connector clear arrow${np}`);
                conn
                    .attr("transform", lineparam.transform );
            }
        }
        // Connect entities
        else if ( cd.conntype == conntypes.subtype ) {
            if (cd.preferred) {
                connpath.attr("d", function() { return subtypePath(lineparam.length) })
                        .attr("class",`connector ${connclass.subtype}${np}`);
                connover.attr("d", function() { return subtypePathDashed(lineparam.length) })
                        .attr("class",`connector clear arrow${np}`);
            } else {
                connpath.attr("d", function() { return linePathArrow(lineparam.length) })
                        .attr("class",`connector ${connclass.subtype} dashed${np}`);
                connover.attr("d", function() { return subtypePathDashed(lineparam.length) })
                        .attr("class",`connector clear arrow${np}`);
            }
            conn.attr("transform", lineparam.transform );
        } 
        // Connect entities and values to roles
        else if ( (cd.conntype == conntypes.EtoRB || cd.conntype == conntypes.VtoRB) ) {
            if ( cd.mandatory ) {
                connpath
                    .attr("d", function() { return linePath(lineparam.length) })
                    .attr("class",`connector ${connclass.mandatory}${np}`); // conn_mandatory
                connover.attr("d", function() { return mandatoryPath(lineparam.length) })
                    .attr("class",`connector clear${np}`);
                conn
                    .attr("transform", lineparam.transform );
            } else {
                connpath.attr("d", function() { return linePath(lineparam.length) })
                        .attr("class",`connector ${connclass[cd.conntype]}${np}`);
                connover.attr("d", function() { return linePath(lineparam.length) })
                        .attr("class",`connector clear${np}`);
                conn
                    .attr("transform", lineparam.transform );
            }
            
        }
    }

    record() {
        // The connection is staying. Let's add it to the orm model.
        orm.connectors[this.id] = this;
    }

    /* Connector behavior */

    connect() {
        
        // Check if object can connect according to ORM rules
        if (! this.can_connect()) { 
            this.shallow_delete();
            return 
        }
        console.log("can connect pass")

        // Attach to data of from/to objects
        this.attach();
        console.log("attach pass", d3.select(`#${this.d3object.datum().from}`).datum().connectors)
        console.log("attach pass", d3.select(`#${this.d3object.datum().to}`).datum().connectors)

        // Record connector
        this.record();
        console.log("record pass", orm.connectors)

        // Assign role using connector
        var assigned = this.assign_role();
        if (!assigned) { 
            this.delete();
            return 
        }
        console.log("assign role pass", this.d3object.datum())

        // Draw connector
        this.update_location();
        console.log("update location pass", this.d3object.datum().x1, this.d3object.datum().y1,
                    this.d3object.datum().x2, this.d3object.datum().y2 )

        // Update ORM
        parse_orm();
    }

    can_connect() {

        // Get data
        var cd = this.d3object.datum();
        var d_from = d3.select("#"+cd.from).datum();

        // Rolebox --> Object: flip, bc always want Object --> Rolebox
        if ( d_from.kind == "rolebox" ) { this.flip(); }
        else if ( d_from.kind == "connector" ) { this.flip(); } 
        else { cd.directed = true; }
        var d_to = d3.select("#"+cd.to).datum();
        d_from = d3.select("#"+cd.from).datum();

        // Entity to entity always allowed
        if ( d_to.kind == "entity" && d_from.kind == "entity") {
            cd.conntype = conntypes.subtype;
            cd.preferred = true;
            return true
        }
        if ( d_from.kind == "entity" || d_from.kind == "value" ) {

            cd.directed = false;

            // Only connect to roleboxes
            if ( d_to.kind != "rolebox" ) { return false }
            
            // Roleboxes only connect to 1 entity/value
            if ( d_to.entity != null ) { return false }
            
            if (d_from.kind == "value") {
                // Values cannot be primary entity
                // (cannot attach to first rolebox)
                var boxID = get_primary_role( d3.select("#"+d_to.parent) );
                if ( cd.to == boxID ) { return false }
                // Connect to value
                cd.conntype = conntypes.VtoRB;
                return true
            }
            // Connect to entity
            cd.conntype = conntypes.EtoRB;
            return true
        }
        if ( d_from.kind == "constraint" ) {
            var constraint = orm.constraints[ cd.from ];
            if ( constraint.can_connect( d3.select("#"+cd.to) ) ) {
                d_to.kind == "rolebox" ? cd.conntype = conntypes.CtoRB
                                       : cd.conntype = conntypes.CtoS;
                return true
            }
            return false
        }

        return false
    }

    update_location() {
        
        /* Set endpoint locations based on what connector is connected to. */

        // Get overlay position of entity that's closest to the other object
        // connected to the connector.
        var cd = this.d3object.datum();

        // Get starting and ending positions from connected object location
        //var from_pos = closest_overlay( d3.select("#"+cd.to).datum(), cd.from, cd.from_loc);
        var to_pos = closest_overlay( d3.select("#"+cd.from).datum(), cd.to, cd.to_loc);
        console.log("to_pos", cd.to, to_pos)
        var from_pos = closest_overlay( to_pos, cd.from, cd.from_loc);
        console.log("from_pos", cd.from, from_pos)
        
        // Move the connector
        cd.x1 = from_pos.x;
        cd.y1 = from_pos.y;
        cd.x2 = to_pos.x;
        cd.y2 = to_pos.y;

        this.draw();

    }

    set_eligible_overlays() {
        /*
            Update which overlay locations this 
            connector is eligible to connect to on the to and from object.

            This is necessary to ensure the connectors look aesthetically
            pleasing and the visual connection points between objects make
            sense based on what is being connected.
        */

        // What are the objects we're connecting?
        var cd = this.d3object.datum();
        var d_to = d3.select("#"+cd.to).datum();
        var d_from = d3.select("#"+cd.from).datum();

        // Don't change for constraint, already set
        if (d_from.kind == "constraint") { return }

        // Default
        cd.from_loc = dragevent.all_locations;
        cd.to_loc = dragevent.all_locations;

        if ( d_to.kind == "rolebox" ) {
            cd.to_loc = eligible_rolebox_locations(cd.to, d_from.kind, cd.to_loc);
        }
        if ( d_from.kind == "rolebox" ) {
            cd.from_loc = eligible_rolebox_locations(cd.from, d_to.kind, cd.from_loc);
        }
    }

    assign_role() {
        
        /* Use connector data to assign a role to an entity or value, or attach
           a constraint to a role. */

        // Get data
        var d_conn = this.d3object.datum();
        var d_rolebox = d3.select("#"+d_conn.to).datum();
        var d_object = d3.select("#"+d_conn.from).datum();
        
        if ( (! d_rolebox) || (! d_object) ) { return false }

        if ( d_rolebox.kind != "rolebox" && d_rolebox.kind != "entity" ) {
            if ( d_rolebox.kind != "connector" ) { return false }
            if ( d_rolebox.conntype != "subtype" ) { return false } 
        }

        if ( d_rolebox.kind == "entity" && d_object.kind == "entity" ) {
            return true
        }

        if (d_object.kind == "entity" || d_object.kind == "value") {
            // Set entity for rolebox
            d_rolebox.entity = d_conn.from;
            // Update primary entity_in for rolebox group
            set_primary_entity( d3.select("#"+d_rolebox.parent) );
            // Check flip condition for rolebox group and redraw connected connectors
            check_flip_and_connectors( d3.select("#"+d_rolebox.parent) );
            // Set eligible overlay locations for linking connector
            d_conn.to_loc = eligible_rolebox_locations(d_conn.to, d_object.kind, d_conn.to_loc);

            return true
        }
        if (d_object.kind == "constraint") {
            if (d_rolebox.kind == "connector") { return true }
            // Set allowed rolebox connection locations
            var closest_loc = closest_overlay({x:d_conn.x2, y:d_conn.y2}, d_conn.to);
            var data = {dragevent: dragevent.locations, closest: closest_loc.location};
            if (d_object.type == "role-value") {
                data.dragevent = ["top", "bottom"];
            }
            d_conn.to_loc = eligible_rolebox_locations(d_conn.to, d_object.kind, data);
            orm.constraints[d_conn.from].propagate_roles();

            return true
        }

        return false

    }

    flip() {
        /* Flip the object that is connected "from" and "to"
           the connector in its datum, cd. */
        
        var cd = this.d3object.datum();
        var cdto = cd.to;
        cd.to = cd.from;
        cd.from = cdto;
        var cdtoloc = [...cd.to_loc];
        cd.to_loc = [...cd.from_loc];
        cd.from_loc = cdtoloc;
    }

    /* End connector behavior */

    /* Subtype connections */

    closest_overlay() {
        return line_midpoint( this.d3object.datum() )
    }

    /* End subtype connections */

    /* Actions */

    actions() {

        var id = this.id;
        this.d3object
            .on("contextmenu", d3.contextMenu(connOptions)) // Right click menu
            .on("click", this.remove); // Delete the connector

        var connover = d3.select(`#o-${this.id}`);

        connover
            .on("mousedown", (event) => { this.mousedown(event, this); })
            .on("mouseover", (d) => { 
                class_as(`p-${id}`, "conn_mouseover"); 
                class_as(`o-${id}`, "conn_mouseover"); 
            })
            .on("mouseout", (d) => { 
                unclass_as(`p-${id}`, "conn_mouseover"); 
                unclass_as(`o-${id}`, "conn_mouseover"); 
            });
    }

    mousedown(event, connector) {

        /* On overlay mousedown, if the connector is a subtype, create a new connector. */

        console.log("mousedown triggered", connector.id, connector.d3object.datum().conntype)
        
        event.stopPropagation();

        // Only subtypes
        if (connector.d3object.datum().conntype != conntypes.subtype) {return}

        if (event.buttons == 2) {return} // Only left click events
        /* Note: this prevents a bug that can sometimes leave a connector behind 
           when someone has clicky fingers. */

        // Current pointer position
        var d = connector.d3object.datum();
        var m = d3.pointer(event);
        var mousepos = { x: m[0] + d.x, y: m[1] + d.y };

        var pos = connector.closest_overlay(mousepos);
        var data = { x1: pos.x, x2: mousepos.x, y1: pos.y, y2: mousepos.y, 
                     conntype: conntypes.CtoRB };
        var conn = new Connector(data);
        var cd = conn.d3object.datum();

        cd.from = connector.id;
        cd.selected = true;

        // Add svg mouse actions for dragging connector across svg
        // We unset these on mouseup (svg_mouseup).
        svg
            .on("mousemove", function (event) { conn.svg_mousemove(event) })
            .on("mouseup", function (event) { conn.svg_mouseup(event) } );
    }

    svg_mousemove(event) {
        /*
            Drag event from an object overlay.

            Draw a line from the overlay and to the cursor,
            following the cursor while the click press continues.
        */
        
        // Set end of line from current pointer position
        var cd = this.d3object.datum();
        var m = d3.pointer(event, this.d3object.node());
        cd.x2 = m[0];
        cd.y2 = m[1];

        // Set beginning of line from closest overlay
        var pos = closest_overlay({x: cd.x2, y: cd.y2}, cd.from);
        cd.x1 = pos.x;
        cd.y1 = pos.y;

        var connpath = d3.select(`#p-${this.id}`);
        connpath.attr("d", null);
        connpath.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]));
    }

    svg_mouseup(event) {

        /*
           Drag event from an object overlay is over.
    
           Determine based on cursor position on mouse up whether
           the connector connects to objects. If so, connect and
           finalize the connector as a new part of the model.
         */
    
        // Turn off svg mouse actions
        svg.on("mousemove", null).on("mouseup", null);
    
        var cd = this.d3object.datum();
        cd.selected = false;
    
        // Only keep line if we're overlapping with an object
        var m = d3.pointer(event, this.d3object.node());
        var mouse_position = {x: m[0], y: m[1] };
        var to_what = closest_object(mouse_position);
    
        // Check with overlap
        if ( to_what.found ) {
            if ( to_what.distance < to_what.tolerance &&
                 to_what.object.attr("id") != cd.from ) {
                // Set object as conn "to"
                cd.to = to_what.object.attr("id");
                // Determine whether objects can be linked 
                // (allowed by logic) and link if so
                this.connect();

                // Reset dragevent
                dragevent.locations = dragevent.all_locations;
                return
            }
        }

        // Reset dragevent
        dragevent.locations = dragevent.all_locations;

        // Don't connect
        this.shallow_delete();

    }

    /* Delete */

    static remove(event) {
        /* Remove connector on click event */

        // Only 2 types of click events should result in deleting connector:
        // Ctrl key for click event, buttons for right click menu
        if (event.ctrlKey || event.buttons == 2) {
            var click_objID = event.target.id.toString();
            try{
                orm.connectors[ get_parentID(click_objID) ].delete();
            }
            catch (e) {
                if (e instanceof TypeError) {
                    console.log("TypeError:", e);
                    console.log(`Attempting to force delete object #${get_parentID(click_objID)}`);
                    try {
                        d3.select(`#${get_parentID(click_objID)}`).remove();
                        console.log("Success.")
                    }
                    catch (e) {
                        console.log(`Failed.`, `Attempting to force delete object #${click_objID}`);
                        d3.select(`#${click_objID}`).remove();
                    }
                    console.log(orm.connectors)
                }
            }
        }
    }

    delete() {
        /* Delete the connector, both visualization and model
       data about it. */

        // Detach from objects (entities/roleboxes)
        this.detach();

        // Remove from record
        delete orm.connectors[ this.id ];

        // Remove the connector visualization
        // Make available for garbage collection
        this.shallow_delete();

        // Update ORM
        parse_orm();
    }

    shallow_delete() {
        // Remove the connector visualization
        this.d3object.remove();

        // Make available for garbage collection
        delete_reference(this);
    }

    detach() {
        this.data_propagate(true);
    }

    /* Attach to objects */

    attach() {
        this.data_propagate();
    }

    data_propagate(detach=false) {

        /*
            Add/remove connection information from objects.

            Using the conn's datum, determine what the conn is 
            connected to and update the object(s) datum(s) to 
            add/remove the connection.
        */
        
        // Find connected objects
        var cd = this.d3object.datum();
        var from_obj = d3.select("#"+cd.from);
        var to_obj = d3.select("#"+cd.to);
        // Get objects' list of connectors
        //     Null condition is in case we're deleting the connector because
        //     we're deleting the object. It might be gone by time we do this step.
        if (from_obj != null) {
            var fr = from_obj.datum().connectors;
            detach ? fr = remove_from_array(fr, this.id ) // Remove conn from list
                   : fr.push(this.id); // Add conn to list
        }
        if (to_obj != null) {
            var tr = to_obj.datum().connectors;
            // Remove conn from lists
            detach ? tr = remove_from_array(tr, this.id ) // Remove conn from list
                   : tr.push(this.id); // Add conn to list
        }
        
        // Add/Remove from rolebox group datum
        propagate_connection_data(from_obj);
        propagate_connection_data(to_obj);

    }

}

/* Geometry transformations */

function resize_and_rotate(pos) {

    /* Path shapes need to be drawn based on distance between positions
       and rotated to indicate connection from (pos.x1, pos.y1)
       to (pos.x2, pos.y2). This function calculates the angle to rotate
       and defines the total length of the path. */

    var totallen = Math.sqrt( Math.pow( (pos.x1 - pos.x2), 2) +
                              Math.pow( (pos.y1 - pos.y2), 2) );
    var transform_string = "translate(" + pos.x1 + " " + pos.y1 + ")";
    var totalangle = Math.atan( ( pos.y2 - pos.y1 ) / ( pos.x2 - pos.x1 ) ) * 180 / Math.PI;
    if (pos.x1 > pos.x2) {totalangle += 180; }
    transform_string += " rotate("+totalangle+")";

    var rr = {transform: transform_string, length: totallen};

    return rr
}

function line_midpoint(pos) {
    return {
        x: (pos.x2 - pos.x1)/2 + pos.x1,
        y: (pos.y2 - pos.y1)/2 + pos.y1,
    }
}