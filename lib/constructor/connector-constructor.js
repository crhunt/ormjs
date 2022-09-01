/*
    Everything related to connectors.

    Connectors are the lines that join Entities, Roleboxes, Values, and Constraints.
    They also include constraints represented by connections, like Subtype, since
    their actions are the same.

*/

/*----- Global definitions -----*/

var ormjs;

/*----- END Global definitions -----*/

ormjs.Connector = class {

    d3object;
    id;
    model;
    view;
    kind = "connector";

    constructor(data) {
        
        if(!data.d3object) {
            this.view = data.view;
            this.model = data.model ? data.model
                                    : ormjs.Graph.any_object(this.view).model;
            this.id =  ormjs.Connector.generateID(this.model);
            this.create_d3object(data);

        } else {
            var d = data.d3object.datum();
            this.id = data.d3object.attr("id");
            this.model = data.model ? data.model
                                    : d.model;
            d.id = this.id;
            this.d3object = data.d3object;
        }

        this.d3object.datum().model = this.model;

        // Ensure view is accurate
        this.view = d3.select( d3.select(`#${this.id}`).node().parentNode ).node().id;
        this.d3object.datum().view = this.view;

        // Add actions
        this.actions();
    }

    static generateID(modelID) {
        return ormjs.Model.generateID(modelID,"connector")
    }

    static find(from_id, to_id) {
        var d = d3.select("#"+to_id).datum();
        var connlist = d.connectors;
        var objects = ormjs.models[d.model];
        for (var n in connlist) {
            if ( objects.connector[connlist[n]].d3object.datum().from == from_id ) { 
                return connlist[n] 
            }
        }
        return null
    }

    static redraw(conns) {
        if (conns.length == 0) { return }
        var connectors = ormjs.Graph.model_from_id(conns[0]).objects.connector;
        var conntypes =  ormjs.Connector.supported_types().names;
        conns.map( (connID) => {
            // Update conn location
            connectors[connID].update_location();
            // Update location of conns connected to subtype
            if ( connectors[connID].d3object.datum().conntype == conntypes.subtype ) {
                var moreconns = connectors[connID].d3object.datum().connectors;
                moreconns.map( (moreconnID) => {
                    connectors[moreconnID].update_location();
                });
            }
        });
    }

    static connect_by_id(aID, bID) {
        // Let locations of each object (...not actually necessary)
        var obja = d3.select("#"+aID);
        var objb = d3.select("#"+bID);
        var data = { x1: obja.datum().x, y1: obja.datum().y,
                     x2: objb.datum().x, y2: objb.datum().y,
                     model:obja.datum().model, view:obja.datum().view };
        // Create connector
        var conn = new ormjs.Connector(data);
        // Assign objects to connector
        var cd = conn.d3object.datum();
        cd.from = aID;
        cd.to = bID;
        // Connect!
        conn.connect();

        return conn
    }

    static supported_types() {
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
        return { names: conntypes, classes: connclass }
    }

    create_d3object(data) {

        var conninfo =  ormjs.Connector.supported_types();
        var conntype = conninfo.names.default;
        if (data.conntype) { conntype = data.conntype; }

        var svg = data.view ? d3.select(`#${data.view}`)
                            : ormjs.models[this.model].currentview.d3object;
        
        // Draw the connector
        var connector = svg.append("g")
            .datum( { x1: data.x1, y1: data.y1, x2: data.x2, y2: data.y2, 
                kind: "connector", selected: false,
                conntype: conntype, preferred: false,
                mandatory: false, directed:false,
                from: "", to: "", 
                connectors: [], // Only for subtypes
                from_loc: ormjs.default_dragevent,
                to_loc: ormjs.default_dragevent } )
            .attr("class", "ormjs-connector_prototype")
            .attr("id",this.id);

        connector.append("path")
            .attr("class", "ormjs-connector "+conninfo.classes[conntype])
            .attr("id","p-"+this.id)
            .attr("d", d3.line()([ [data.x1,data.y1], [data.x2,data.y2] ]));
        
        connector.append("path")
            .attr("class", "ormjs-connector clear")
            .attr("id","o-"+this.id)
            .attr("d", d3.line()([ [data.x1,data.y1], [data.x2,data.y2] ]));

        this.d3object = connector;
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
        conn.attr("class").includes("ormjs-notparsed") ? np = " ormjs-notparsed" : np = "";

        // Get line parameters
        var cd = conn.datum();
        var lineparam = ormjs.Geometry.resize_and_rotate(cd);

        var conninfo =  ormjs.Connector.supported_types();
        var conntypes = conninfo.names;
        var connclass = conninfo.classes;
        if ( cd.conntype == conntypes.default ) {
            connpath.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]))
                    .attr("class",`ormjs-connector ${connclass.default}${np}`);
            connover.attr("d", null);
        }
        // Connect to constraint
        else if ( cd.conntype == conntypes.CtoRB || cd.conntype == conntypes.CtoS ) {
            var type = d3.select(`#${cd.from}`).datum().type;
            var draw_arrows = ["subset"];
            if ( draw_arrows.includes(type) && cd.directed ) {
                connpath.attr("d", function() { return ormjs.ConnPath.linePathArrow(lineparam.length) })
                        .attr("class",`ormjs-connector ${connclass.CtoRB}${np}`);
                connover.attr("d", function() { return ormjs.ConnPath.constraintArrowPath(lineparam.length) })
                        .attr("class",`ormjs-connector clear arrow${np}`);
                conn
                    .attr("transform", lineparam.transform );
            } 
            else if ( cd.to == "" || cd.from == "" ) {
                connpath.attr("d", function() { return ormjs.ConnPath.linePath(lineparam.length) })
                        .attr("class",`ormjs-connector ${connclass.CtoRB}${np}`);
                connover.attr("d", function() { return ormjs.ConnPath.linePath(lineparam.length) })
                        .attr("class",`ormjs-connector clear${np}`);
                conn
                    .attr("transform", lineparam.transform );
            }
            else {
                connpath.attr("d", function() { return ormjs.ConnPath.linePath(lineparam.length) })
                        .attr("class",`ormjs-connector ${connclass.CtoRB} connected${np}`);
                connover.attr("d", function() { return ormjs.ConnPath.linePath(lineparam.length) })
                        .attr("class",`ormjs-connector clear arrow${np}`);
                conn
                    .attr("transform", lineparam.transform );
            }
        }
        // Connect entities
        else if ( cd.conntype == conntypes.subtype ) {
            if (cd.preferred) {
                connpath.attr("d", function() { return ormjs.ConnPath.subtypePath(lineparam.length) })
                        .attr("class",`ormjs-connector ${connclass.subtype}${np}`);
                connover.attr("d", function() { return ormjs.ConnPath.subtypePathDashed(lineparam.length) })
                        .attr("class",`ormjs-connector clear arrow${np}`);
            } else {
                connpath.attr("d", function() { return ormjs.ConnPath.linePathArrow(lineparam.length) })
                        .attr("class",`ormjs-connector ${connclass.subtype} dashed${np}`);
                connover.attr("d", function() { return ormjs.ConnPath.subtypePathDashed(lineparam.length) })
                        .attr("class",`ormjs-connector clear arrow${np}`);
            }
            conn.attr("transform", lineparam.transform );
        } 
        // Connect entities and values to roles
        else if ( (cd.conntype == conntypes.EtoRB || cd.conntype == conntypes.VtoRB) ) {
            if ( cd.mandatory ) {
                connpath
                    .attr("d", function() { return ormjs.ConnPath.linePath(lineparam.length) })
                    .attr("class",`ormjs-connector ${connclass.mandatory}${np}`); // conn_mandatory
                connover.attr("d", function() { return ormjs.ConnPath.mandatoryPath(lineparam.length) })
                    .attr("class",`ormjs-connector clear${np}`);
                conn
                    .attr("transform", lineparam.transform );
            } else {
                connpath.attr("d", function() { return ormjs.ConnPath.linePath(lineparam.length) })
                        .attr("class",`ormjs-connector ${connclass[cd.conntype]}${np}`);
                connover.attr("d", function() { return ormjs.ConnPath.linePath(lineparam.length) })
                        .attr("class",`ormjs-connector clear${np}`);
                conn
                    .attr("transform", lineparam.transform );
            }
            
        }
    }

    record() {
        // The connection is staying. Let's add it to the orm model.
        ormjs.models[this.model].objects[this.kind][this.id] = this;
    }

    /* Connector behavior */

    connect() {
        
        // Check if object can connect according to ORM rules
        if (! this.can_connect()) { 
            var d = this.d3object.datum();
            console.log(`ORM Logic Error: connection not allowed between ${d.from} and ${d.to}.`)
            this.shallow_delete();
            return 
        }

        // Attach to data of from/to objects
        this.attach();

        // Record connector
        this.record();

        // Assign role using connector
        var assigned = this.assign_role();
        if (!assigned) { 
            console.log(`Logic Error: connection allowed between ${d.from} and ${d.to} but not assignable. This shouldn't happen.`)
            this.delete();
            return 
        }

        // Draw connector
        this.update_location();

        // Update ORM
        ormjs.models[this.model].update();
    }

    can_connect() {

        // Get data
        var cd = this.d3object.datum();
        var d_from = d3.select("#"+cd.from).datum();
        var conntypes =  ormjs.Connector.supported_types().names;
        var objects = ormjs.models[this.model].objects;

        // Rolebox --> Object: flip, bc always want Object --> Rolebox
        if ( d_from.kind == "rolebox" ) { this.flip(); }
        else if ( d_from.kind == "connector" ) { this.flip(); } 
        else { cd.directed = true; }
        var d_to = d3.select("#"+cd.to).datum();
        d_from = d3.select("#"+cd.from).datum();

        // From entity to object
        if ( d_from.kind == "entity" ) {
            var entity = objects.entity[ cd.from ];
            if ( entity.can_connect( d3.select("#"+cd.to) ) ) {
                if (d_to.kind == "rolebox") {
                    cd.conntype = conntypes.EtoRB;
                    return true
                } else if (d_to.kind == "entity") {
                    cd.conntype = conntypes.subtype;
                    cd.preferred = true;
                    return true
                } else {
                    console.log(`Logic Error: entity ${cd.from} can connect to object ${cd.to}, ` +
                                `but connection type undetermined. This shouldn't happen.`);
                    return false
                }
            }
            return false
        }

        // From value to object
        if ( d_from.kind == "value" ) {
            var value = objects.value[ cd.from ];
            if ( value.can_connect( d3.select("#"+cd.to) ) ) {
                if (d_to.kind == "rolebox") {
                    cd.conntype = conntypes.VtoRB;
                    return true
                } else {
                    console.log(`Logic Error: value ${cd.from} can connect to object ${cd.to}, ` +
                                `but connection type undetermined. This shouldn't happen.`);
                    return false
                }
            }
            return false
        }

        if ( d_from.kind == "constraint" ) {
            var constraint = objects.constraint[ cd.from ];
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
        //var from_pos = Graph.closest_overlay( d3.select("#"+cd.to).datum(), cd.from, cd.from_loc);
        var to_pos = ormjs.Graph.closest_overlay( d3.select("#"+cd.from).datum(), cd.to, cd.to_loc);
        var from_pos = ormjs.Graph.closest_overlay( to_pos, cd.from, cd.from_loc);
        
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
        var dragevent = ormjs.models[cd.model].dragevent;
        var objects = ormjs.models[this.model].objects;

        // Don't change for constraint, already set
        if (d_from.kind == "constraint") { return }

        // Default
        cd.from_loc = dragevent.all_locations;
        cd.to_loc = dragevent.all_locations;

        if ( d_to.kind == "rolebox" ) {
            //cd.to_loc = eligible_rolebox_locations(cd.to, d_from.kind, cd.to_loc);
            cd.to_loc = objects.rolebox[cd.to].eligible_locations(d_from.kind, cd.to_loc);
            
        }
        if ( d_from.kind == "rolebox" ) {
            //cd.from_loc = eligible_rolebox_locations(cd.from, d_to.kind, cd.from_loc);
            cd.from_loc = objects.rolebox[cd.from].eligible_locations(d_to.kind, cd.from_loc);
        }
    }

    assign_role() {
        
        /* Use connector data to assign a role to an entity or value, or attach
           a constraint to a role or subtype. */

        // Get data
        var d_conn = this.d3object.datum();
        var d_rolebox = d3.select("#"+d_conn.to).datum();
        var d_object = d3.select("#"+d_conn.from).datum();
        var conntypes =  ormjs.Connector.supported_types().names;
        var objects = ormjs.models[this.model].objects;
        
        if ( (! d_rolebox) || (! d_object) ) { return false }

        if ( d_rolebox.kind != "rolebox" && d_rolebox.kind != "entity" ) {
            if ( d_rolebox.kind != "connector" ) { return false }
            if ( d_rolebox.conntype != conntypes.subtype ) { return false } 
        }

        if ( d_rolebox.kind == "entity" && d_object.kind == "entity" ) {
            return true
        }

        if (d_object.kind == "entity" || d_object.kind == "value") {
            // Set entity for rolebox
            d_rolebox.entity = d_conn.from;
            // Update primary entity_in for rolebox group
            objects["predicate"][d_rolebox.parent].set_subject();
            // Check flip condition for rolebox group and redraw connected connectors
            objects["predicate"][d_rolebox.parent].update_flip();
            // Set eligible overlay locations for linking connector
            d_conn.to_loc = objects.rolebox[d_conn.to].eligible_locations(d_object.kind, d_conn.to_loc);

            return true
        }
        if (d_object.kind == "constraint") {
            if (d_rolebox.kind == "connector") { return true }
            var dragevent = ormjs.models[d_conn.model].dragevent;
            // Set allowed rolebox connection locations
            var closest_loc = ormjs.Graph.closest_overlay({x:d_conn.x2, y:d_conn.y2}, d_conn.to);
            var data = {dragevent: dragevent.locations, closest: closest_loc.location};
            if (d_object.type == "role-value") {
                data.dragevent = ["top", "bottom"];
            }
            //d_conn.to_loc = eligible_rolebox_locations(d_conn.to, d_object.kind, data);
            d_conn.to_loc = objects.rolebox[d_conn.to].eligible_locations(d_object.kind, data);
            objects.constraint[d_conn.from].propagate_roles();

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
        return ormjs.Geometry.line_midpoint( this.d3object.datum() )
    }

    static all_subtypes(modelID) {
        // List all subtype connections
        var subtypes = {};
        var conntypes =  ormjs.Connector.supported_types().names;
        var connectors = ormjs.models[modelID].objects.connector;
        
        for (var connID in connectors) {
            if (connectors[connID].d3object.datum().conntype == conntypes.subtype) {
                subtypes[connID] = connectors[connID];
            }
        }
        return subtypes
    }

    /* End subtype connections */

    /* Actions */

    actions() {

        var id = this.id;
        var connMenu = (d) => { return ormjs.OptionMenu.connector_menu(d, this.model) };
        this.d3object
            .on("contextmenu", d3.contextMenu(connMenu)) // Right click menu
            .on("click", this.remove); // Delete the connector

        var connover = d3.select(`#o-${this.id}`);

        connover
            .on("mousedown", (event) => { this.mousedown(event, this); })
            .on("mouseover", (d) => { 
                ormjs.Graph.class_as(`p-${id}`, "conn_mouseover"); 
                ormjs.Graph.class_as(`o-${id}`, "conn_mouseover"); 
            })
            .on("mouseout", (d) => { 
                ormjs.Graph.unclass_as(`p-${id}`, "conn_mouseover"); 
                ormjs.Graph.unclass_as(`o-${id}`, "conn_mouseover"); 
            });
    }

    mousedown(event, connector) {

        /* On overlay mousedown, if the connector is a subtype, create a new connector. */
        
        event.stopPropagation();
        var conntypes =  ormjs.Connector.supported_types().names;

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
                     conntype: conntypes.CtoRB, model: connector.model, 
                     view: connector.view };
        var conn = new  ormjs.Connector(data);
        var cd = conn.d3object.datum();

        cd.from = connector.id;
        cd.selected = true;

        var svg = ormjs.models[connector.model].currentview.d3object;

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
        var locations = ormjs.models[cd.model].dragevent.locations;
        var pos = ormjs.Graph.closest_overlay({x: cd.x2, y: cd.y2}, cd.from, locations);
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
    
        var cd = this.d3object.datum();
        cd.selected = false;
        var svg = ormjs.models[cd.model].currentview.d3object;
        var dragevent = ormjs.models[cd.model].dragevent;

        // Turn off svg mouse actions
        svg.on("mousemove", null).on("mouseup", null);
    
        // Only keep line if we're overlapping with an object
        var m = d3.pointer(event, this.d3object.node());
        var mouse_position = {x: m[0], y: m[1] };
        var to_what = ormjs.Graph.closest_object(mouse_position,cd.model);
    
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
                var connID = ormjs.Graph.get_parentID(click_objID);
                ormjs.Graph.any_object(connID).delete();
            }
            catch (e) {
                if (e instanceof TypeError) {
                    console.log("TypeError:", e);
                    console.log(`Attempting to force delete object #${Graph.get_parentID(click_objID)}`);
                    try {
                        d3.select(`#${Graph.get_parentID(click_objID)}`).remove();
                        console.log("Success.")
                    }
                    catch (e) {
                        console.log(`Failed.`, `Attempting to force delete object #${click_objID}`);
                        d3.select(`#${click_objID}`).remove();
                    }
                }
            }
        }
    }

    delete() {
        /* Delete the connector, both visualization and model
           data about it. */

        // If a subtype, delete connectors to subtype
        this.constraint_connector_delete();

        // Detach, remove from record, remove visualization
        this.simple_delete();

        // Update ORM
        ormjs.models[this.model].update();
    }

    simple_delete() {

        // Detach from objects (entities/values/roleboxes/subtypes)
        this.detach();

        // Remove from record
        var objects = ormjs.models[this.model].objects.connector;
        delete objects[ this.id ];

        // Remove the connector visualization
        // Make available for garbage collection
        this.shallow_delete();

    }

    constraint_connector_delete() {
        
        var conntypes =  ormjs.Connector.supported_types().names;
        var connectors = ormjs.models[this.model].objects.connector;
        var d = this.d3object.datum();
        if ( d.conntype == conntypes.subtype ) {
            var conns = [... d.connectors];
            conns.map( (connID) => {
                connectors[connID].simple_delete();
            });
        }
    }

    shallow_delete() {
        // Remove the connector visualization
        this.d3object.remove();
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
            detach ? fr = ormjs.GraphUtils.remove_from_array(fr, this.id ) // Remove conn from list
                   : fr.push(this.id); // Add conn to list
        }
        if (to_obj != null) {
            var tr = to_obj.datum().connectors;
            // Remove conn from lists
            detach ? tr = ormjs.GraphUtils.remove_from_array(tr, this.id ) // Remove conn from list
                   : tr.push(this.id); // Add conn to list
        }
        
        // Add/Remove from rolebox group datum
        var roleboxes = ormjs.models[this.model].objects.rolebox;
        if (from_obj.datum().kind == "rolebox") {
            roleboxes[cd.from].bubble_connectors();
        }
        if (to_obj.datum().kind == "rolebox") {
            roleboxes[cd.to].bubble_connectors();
        }

    }

    /* Connections */

    static neighbors(objID) {
        var connlist = d3.select(`#${objID}`).datum().connectors;
        return connlist.map( (connID) => {
            var d = d3.select(`#${connID}`).datum();
            var target = d.from == objID ? d.to : d.from;
            var parent = d3.select(`#${target}`).datum().parent;
            if (target != parent) { return [target,parent] } // Rolebox
            else { return target }
        }).flat().filter(v=>v);
    }

}
