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
    subtype: "conn_subtype",
    default: "conn_line",
    EtoRB: "conn_line",
    VtoRB: "conn_line",
    mandatory: "conn_mandatory",
    CtoRB: "conn_constraint",
    CtoS: "conn_constraint"
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
            orm.connectors[connID].update_location();
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
        
        // Draw the line
        var line = svg.append("path")
            .datum( { x1: pos.x1, y1: pos.y1, x2: pos.x2, y2: pos.y2, 
                    kind: "connector", selected: false,
                    conntype: conntype, 
                    mandatory: false,
                    from: "", to: "",
                    from_loc: dragevent.all_locations,
                    to_loc: dragevent.all_locations } )
            .attr("class", connclass[conntype])
            .attr("id",this.id)
            .attr("d", d3.line()([ [pos.x1,pos.y1], [pos.x2,pos.y2] ]));

        this.d3object = line;

        // Add actions for the connector.
        this.actions();
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
        
        // Retain notparsed class information
        var np;
        conn.attr("class").includes("notparsed") ? np = " notparsed" : np = "";

        // Get line parameters
        var cd = conn.datum();
        var lineparam = resize_and_rotate(cd);

        if ( cd.conntype == conntypes.default ) {
            conn.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]))
                .attr("class",`connector ${connclass.default}${np}`);
        }
        else if ( cd.conntype == conntypes.CtoRB ) {
            conn.attr("d", function() { return linePath(lineparam.length).outline })
                .attr("class",`connector ${connclass.CtoRB}${np}`)
                .attr("transform", lineparam.transform );
        }
        else if ( cd.conntype == conntypes.subtype ) {
            conn.attr("d", function() { return subtypePath(lineparam.length).outline })
                .attr("class",`connector ${connclass.subtype}${np}`)
                .attr("transform", lineparam.transform );
        } 
        else if ( (cd.conntype == conntypes.EtoRB || cd.conntype == conntypes.VtoRB) && 
                  cd.mandatory == false) {
            conn.attr("d", function() { return linePath(lineparam.length).outline })
                .attr("class",`connector ${connclass[cd.conntype]}${np}`)
                .attr("transform", lineparam.transform );
        }
        else if ( (cd.conntype == conntypes.EtoRB || cd.conntype == conntypes.VtoRB) && 
                  cd.mandatory == true) {
            conn
                .attr("d", function() { return mandatoryPath(lineparam.length).outline })
                .attr("class",`connector ${connclass.mandatory}${np}`) // conn_mandatory
                .attr("transform", lineparam.transform );
        }
    }

    record() {
        // The connection is staying. Let's add it to the orm model.
        orm.connectors[this.id] = this;
    }

    connect() {
        
        // Check if object can connect according to ORM rules
        if (! this.can_connect()) { 
            this.shallow_delete();
            return 
        }

        // Attach to data of from/to objects
        this.attach();

        // Record connector
        this.record();

        // Assign role using connector
        this.assign_role();

        // Draw connector
        this.update_location();

        // Update ORM
        parse_orm();
    }

    can_connect() {

        // Get data
        var cd = this.d3object.datum();
        var d_from = d3.select("#"+cd.from).datum();

        // Rolebox --> Object: flip, bc always want Object --> Rolebox
        if ( d_from.kind == "rolebox" ) { this.flip(); }
        if ( d_from.kind == "connector" ) { this.flip(); }
        var d_to = d3.select("#"+cd.to).datum();
        d_from = d3.select("#"+cd.from).datum();

        // Entity to entity always allowed
        if ( d_to.kind == "entity" && d_from.kind == "entity") {
            cd.conntype = conntypes.subtype;
            return true
        }
        if ( d_from.kind == "entity" || d_from.kind == "value" ) {
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
        
        /* Set endpoint location based on what connector is connected to. */

        // Get overlay position of entity that's closest to the other object
        // connected to the connector.
        var cd = this.d3object.datum();
        
        /*if( get_object_kind(cd.to) == "constraint" && get_object_kind(cd.from) == "rolebox") {
            var d = d3.select("#"+get_parentID(cd.from)).datum();
            var pos
        }*/

        // Get starting and ending positions from connected object location
        //var from_pos = closest_overlay( d3.select("#"+cd.to).datum(), cd.from, cd.from_loc);
        var to_pos = closest_overlay( d3.select("#"+cd.from).datum(), cd.to, cd.to_loc);
        var from_pos = closest_overlay( to_pos, cd.from, cd.from_loc);
        
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
        
        if ( (! d_rolebox) || (! d_object) ) { return }

        if ( d_rolebox.kind != "rolebox" ) { return }

        if (d_object.kind == "entity" || d_object.kind == "value") {
            // Set entity for rolebox
            d_rolebox.entity = d_conn.from;
            // Update primary entity_in for rolebox group
            set_primary_entity( d3.select("#"+d_rolebox.parent) );
            // Check flip condition for rolebox group and redraw connected connectors
            check_flip_and_connectors( d3.select("#"+d_rolebox.parent) );
            // Set eligible overlay locations for linking connector
            d_conn.to_loc = eligible_rolebox_locations(d_conn.to, d_object.kind, d_conn.to_loc);
        }
        if (d_object.kind == "constraint") {
            // Set allowed rolebox connection locations
            var closest_loc = closest_overlay({x:d_conn.x2, y:d_conn.y2}, d_conn.to);
            var data = {dragevent: dragevent.locations, closest: closest_loc.location};
            if (d_object.type == "internal-frequency" || d_object.type == "role-value") {
                data.dragevent = ["top", "bottom"];
            }
            d_conn.to_loc = eligible_rolebox_locations(d_conn.to, d_object.kind, data);
            orm.constraints[d_conn.from].propagate_roles();
        }


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

    /* Actions */

    actions() {
        this.d3object
            .on("contextmenu", d3.contextMenu(connOptions)) // Right click menu
            .on("click", this.remove_connector); // Delete the connector
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

        this.d3object.attr("d", null);

        this.d3object.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]));
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

    static remove_connector(event) {
        /* Remove connector on click event */

        // Only 2 types of click events should result in deleting connector:
        // Ctrl key for click event, buttons for right click menu
        if (event.ctrlKey || event.buttons == 2) {
            var click_objID = event.target.id.toString();
            orm.connectors[click_objID].delete();
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
