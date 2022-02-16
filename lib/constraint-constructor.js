// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg
var dragevent;
var conntypes;

// Distance tolerances for snap and link events
var tolerance; // Defined in graph-constructor
tolerance.link["constraint"] = parse_number( get_css_variable('--constraint-oradius') );
tolerance.snap["constraint"] = parse_number( get_css_variable('--constraint-radius') )/5;

var constrainttypes = {
    inclusive_or: "inclusive-or",
    exclusion: "exclusion",
    exclusive_or: "exclusive-or",
    equality: "equality",
    external_freq: "external-frequency",
    internal_freq: "internal-frequency",
    identifier: "identifier",
    preferred_id: "preferred-identifier",
    subset: "subset",
    role_value: "role-value"
};

class Constraint {

    d3object;
    id;
    param = {
        oradius : parse_number( get_css_variable('--constraint-oradius') ),
        radius : parse_number( get_css_variable('--constraint-radius') ),
        stroke : parse_number( get_css_variable('--stroke-width') )
    };

    constructor(data) {
        
        if(!data.d3object) {
            this.id = Constraint.generateID();
            this.create_d3object(data.x, data.y);

        } else {
            this.id = data.d3object.attr("id");
            this.d3object = data.d3object;
        }

        // Record object
        this.record();

        // Update ORM
        parse_orm();
    }

    static generateID() {
        var constID = "id-constraint-" + orm.highestConstID.toString();
        orm.highestConstID += 1;
        return constID
    }

    create_d3object(x,y) {

        var default_type = constrainttypes.exclusive_or;
        
        // Create group
        var constraint = svg.append("g")
            .datum( { x: x, y: y, dx: x, dy: y, x0: 0, y0: 0,
                      selected: false, connectors: [],
                      kind: "constraint", type: default_type,
                      content: "", deontic: false, 
                      ring: false, obligatory: false } )
            .attr("class", "constraint_prototype")
            .attr("id", this.id)
            .attr("parent", this.id)
            .attr("width", 2*this.param.radius)
            .attr("height", 2*this.param.radius);

        constraint.append("circle")
            .attr("class", `overlay coverlay`)
            .attr("id", `o-${this.id}`)
            .attr("r", this.param.oradius);

        // Add constraint visualization
        Constraint.draw_constraint(constraint);

        constraint.attr("transform", () => translate(x,y));

        this.d3object = constraint;

        // Add actions
        this.actions();
    }

    record() {
        orm.constraints[this.id] = this;
    }

    redraw() {

        // Correct content
        this.set_content();
        // Set radius data
        this.set_radius();
        // Group
        d3.select(`#${this.id}`)
            .attr("width", 2*this.param.radius)
            .attr("height", 2*this.param.radius);
        // Overlay
        d3.select(`#o-${this.id}`)
            .attr("r", this.param.oradius);

        // Draw contraint
        Constraint.draw_constraint(this.d3object);

        // Redraw connectors
        Connector.redraw(this.d3object.datum().connectors);
        
    }

    set_content(val) {
        
        var allow_content = ["internal-frequency", "external-frequency", "role-value"];
        
        var d = this.d3object.datum();
        if (d.type == "subset") { d.content = "⊆"; }
        else if (!allow_content.includes(d.type)) { d.content = ""; }
        
        if (arguments.length == 1 && allow_content.includes(d.type)) {
            d.content = val;
        }

        d.content = d.content.replaceAll(" ", "");
        d.content = d.content.replace(">=", "≥");
        d.content = d.content.replace("<=", "≤");
    }

    set_radius() {

        // Default radius
        var r = parse_number( get_css_variable('--constraint-radius') );
        var or = parse_number( get_css_variable('--constraint-oradius') );

        // Set based on value of content
        if (this.d3object.datum().content.length > 0) {
            var dr = or-r;
            var newr = (this.d3object.datum().content.length*12 + 4)/2;
            var ndot = this.d3object.datum().content.split(".").length -1;
            newr = newr - ndot*4;
            r = Math.max(newr, r);
            or = r+dr;
        }

        this.param.radius = r;
        this.param.oradius = or;
    }

    static supported_types() {
        return ["inclusive-or", "exclusion", "exclusive-or", "equality",
                "identifier", "preferred-identifier", "subset", "external-frequency",
                "internal-frequency"]
    }

    static draw_constraint(d3parent) {
        
        /* 
           We draw constraints through a static function because we also 
           use this to generate constraint images in the property menu.
         */

        var id = d3parent.attr("id");
        d3.select(`#c-${id}`).remove();

        // Set radius
        var radius = d3parent.attr("width")/2;
        
        d3parent.append("circle")
            .attr("class", "constraint")
            .attr("id",`c-${id}`)
            .attr("shape-rendering","geometricPrecision")
            .attr("r", radius);
        
        if (d3parent.datum().type == "internal-frequency") {
            class_as(`c-${id}`, "clear");
        }

        Constraint.draw_constraint_path(d3parent);

    }

    static draw_constraint_path(d3parent) {

        // Remove current constraint visualization
        var id = d3parent.attr("id");
        d3.select(`#val-${id}`).remove();
        
        // Type of constraint
        var constrainttype = d3parent.datum().type;

        // Add path visualization
        var path = Constraint.constraint_path(d3parent);
        if (path != null) {
            d3parent.datum().content = "";
            d3parent.append("path")
                .attr("d", path)
                .attr("class", "constraint_val " + constrainttype)
                .attr("id", `val-${id}`);
            return
        }

        // Add text visualization
        //if (d3parent.datum().type == "subset") { d3parent.datum().content = "⊆"; }
        d3parent.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("class", "constraint_text " + constrainttype)
            .attr("id", `val-${id}`)
            .text( d3parent.datum().content );
    }

    static constraint_path(d3object, r=-1) {
        
        if(r < 0) { r = d3object.attr("width")/2; }
        var paths = {
            "inclusive-or": () => {return inclusive_or_path(r) },
            "exclusion": () => {return exclusion_path(r) },
            "exclusive-or": () => {return exclusive_or_path(r) },
            "equality": () => {return equality_path(r) },
            "identifier": () => {return identifier_path(r) },
            "preferred-identifier": () => {return preferred_identifier_path(r) }
        };
        return paths[d3object.datum().type]
    }

    static valid_frequency_content(str) {
        // Check that str contains valid frequency content
        if (str.length == 0) {return false}
        var rgnum = "(\-)?[0-9]+((.)?[0-9]+)?";
        var rgrng = "(( )?(..( )?)?"+rgnum+")?";
        var regex = new RegExp("^([\>\<≥≤])?(\=)?( )?([\(\[]( )?)?"+rgnum+rgrng+"(( )?[\)\]]?)?$");
        if (regex.test(str)) { return true }
        return false
    }

    duplicate() {
        // Create new constraint
        var d = this.d3object.datum()

        // Location for duplicate
        var offset = this.param.radius*2;
        var pos = { x : d.x + offset, y : d.y + offset };

        // Duplicate
        var constcopy = new Constraint(pos);
        var dc = constcopy.d3object.datum();

        var match_datum = ["type", "content", "deontic", "ring", "obligatory"];
        match_datum.map( (n) => { dc[n] = d[n]; });

        // Redraw
        constcopy.redraw();

        // Update orm
        parse_orm();

    }

    /* Actions */

    actions() {
        // Drag actions
        var drag_constraint = d3.drag()
            .on("start", this.dragstarted)
            .on("drag", (event, d) => { this.dragged(event, d, this); } )
            .on("end",  this.dragended);
        
        // Object actions
        this.d3object
            .on("dblclick", popup_event)
            .on("contextmenu", d3.contextMenu(constraintOptions)) // Right click menu
            .on("click", this.remove) // Ctrl+click --> remove constraint
            .call(drag_constraint);

        // Overlay actions
        var overlay = d3.select(`#o-${this.id}`);
        overlay.on("mousedown", (event) => { this.mousedown(event, this); });
    }

    dragstarted(event) {
        event.sourceEvent.stopPropagation();
        d3.select(this).datum().selected = true;
        d3.select(this).style("cursor", "grabbing");
    }

    dragged(event, d, constraint) {

        if (constraint.d3object.classed("selected")) {
            drag_selected(event);
        } else {
            
            // Set the new position
            d.dx += event.dx;
            d.dy += event.dy;
    
            // Snap to entities
            d.dx = snap( d.dx + d.x0, "x", constraint.id ) - d.x0;
            d.dy = snap( d.dy + d.y0, "y", constraint.id ) - d.y0;
            d.x = d.x0 + d.dx;
            d.y = d.y0 + d.dy;
    
            // Drag constraint
            constraint.move();

            // Redraw all connected connectors
            Connector.redraw(d.connectors);
        }
    }

    dragended() {
        d3.select(this).datum().selected = false;
        d3.select(this).style("cursor", "grab");
    }

    move() {
        var d = this.d3object.datum();
        this.d3object
            .attr("x", d.x)
            .attr("y", d.y )
            .attr("transform", () => translate(d.dx,d.dy));
    }

    mousedown(event, constraint) {
        
        event.stopPropagation();

        // Current pointer position
        var d = constraint.d3object.datum();
        var m = d3.pointer(event);
        var mousepos = { x: m[0] + d.x, y: m[1] + d.y };

        var pos = this.closest_overlay(mousepos);
        var data = { x1: pos.x, x2: mousepos.x, y1: pos.y, y2: mousepos.y, 
                    conntype: conntypes.CtoRB};
        var conn = new Connector(data);
        var cd = conn.d3object.datum();

        cd.from = constraint.id;
        cd.selected = true;

        // Add svg mouse actions for dragging connector across svg
        // We unset these on mouseup (svg_mouseup).
        svg
            .on("mousemove", function (event) { conn.svg_mousemove(event) })
            .on("mouseup", function (event) { conn.svg_mouseup(event) } );
    }

    /* End Actions */

    /* Delete */

    static remove(event) {
        /* Remove connector on click event */

        // Only 2 types of click events should result in deleting constraint:
        // Ctrl key for click event, buttons for right click menu
        event.stopPropagation();
        if (event.ctrlKey || event.buttons == 2) {
            var click_objID = event.target.id.toString();
            var parentID = get_parentID(click_objID);
            orm.constraints[parentID].delete();
        }
    }

    delete() {

        // Delete connectors
        var d = this.d3object.datum();
        var conns = [... d.connectors];
        conns.map( (connID) => {
            orm.connectors[connID].delete();
        });

        // Remove visualizaiton
        this.d3object
            .transition()
            .duration(400)
            .attr("transform", "translate(" + d.x + "," + d.y + ") scale(0)")
            .remove();

        // Remove from records
        delete orm.constraints[ this.id ];

        // If related pop-up exists, remove it
        if ( ! d3.select("#pop-"+this.id).empty() ) { 
            remove_popup( d3.select("#pop-"+this.id) ); 
        }

        // Update ORM
        parse_orm();

        // Make available for garbage collection
        delete_reference(this);
    }

    /* End Delete */

    /* Connections */

    closest_overlay(pos) {
        var d = this.d3object.datum();
        var posdata = {x1: d.x, y1: d.y, x2: pos.x, y2: pos.y, r: this.param.radius};
        
        return point_on_circle(posdata)
    }

    roles() {
        var conns = this.d3object.datum().connectors;
        var roles = conns.map( (connID) => {
            var cd = orm.connectors[connID].d3object.datum();
            if ( cd.conntype == conntypes.CtoRB ) { return cd.to }
        }).filter(v => v);

        return roles
    }

    subtype_roles() {
        var conns = this.d3object.datum().connectors;
        var roles = conns.map( (connID) => {
            var cd = orm.connectors[connID].d3object.datum();
            if ( cd.conntype == conntypes.CtoS ) { return cd.to }
        }).filter(v => v);

        return roles
    }

    entities() {
        var roles = this.roles();
        var entities = roles.map( (rboxID) => {
            return d3.select("#"+rboxID).datum().entity
        });

        var subroles = this.subtype_roles();
        entities.push.apply( entities, subroles.map( (connID) => {
            return d3.select("#"+connID).datum().to
        }) );

        return entities
    }

    primary_entities() {
        var roles = this.roles();
        var entities = roles.map( (rboxID) => {
            var rbgroup = d3.select("#" + d3.select("#"+rboxID).attr("parent"));
            return rbgroup.datum().entity_in
        });

        var subroles = this.subtype_roles();
        entities.push.apply( entities, subroles.map( (connID) => {
            return d3.select("#"+connID).datum().from
        }) );

        return entities
    }

    neighbor_roles() {
        /* If a constraint is connected between 2 roleboxes, we assume we want
           to connect to both. */

        // Current connectors
        var conns = this.d3object.datum().connectors;

        // Roles they connect
        var lr = ["left", "right"];
        var role_info = conns.map( (connID) => {
            var cd = orm.connectors[connID].d3object.datum();
            if ( cd.conntype == conntypes.CtoRB &&
                 lr.includes(cd.to_loc[0]) ) { 
                     return {rboxID: cd.to, location: cd.to_loc[0], directed: cd.directed} 
            }
        }).filter(v => v);
        // New role to connect
        var add_role = role_info.map( (r) => {
            var rbgroup = d3.select( "#"+ d3.select(`#${r.rboxID}`).attr("parent") );
            var boxes = [...rbgroup.datum().boxes];
            var ind = boxes.indexOf(r.rboxID);
            if (r.location == "left" && ind > 0 ) {
                return {rboxID: boxes[ind-1], location: "right", directed: r.directed};
            } else if (ind < boxes.length-1) {
                return {rboxID: boxes[ind+1], location: "left", directed: r.directed};
            }
        }).filter(v => v);

        return add_role
    }

    propagate_roles() {

        /* If a constraint is connected between 2 roleboxes, we assume we want
           to connect to both. */

        // Current roles
        var roles = this.roles();

        // Roles to add
        var neighbors = this.neighbor_roles();

        // Create connections to new roles
        neighbors.map( (r) => {
            if (! roles.includes(r.rboxID) ) {
                dragevent.locations = [ r.location ];
                // Directed is important if the constraint is directed.
                // Want to match direction
                r.directed ? Connector.connect_by_id(this.id, r.rboxID)
                           : Connector.connect_by_id(r.rboxID, this.id);
            }
        }).filter(v => v);
        dragevent.locations = dragevent.all_locations;

    }

    can_connect(d3target) {
        /* Check that this constraint can connect to the target */

        // Only connect to roleboxes or subtype constraints
        var d = d3target.datum();
        if ( (d.kind != "connector" && d.kind != "rolebox") || 
             (d.kind == "connector" && d.conntype != conntypes.subtype) ) {
                 return false
        }

        // Rolebox must be assigned
        if (d.kind == "rolebox" && d.entity == null) { return false }

        // No connections, no problems
        var ctd = this.d3object.datum();
        var conns = ctd.connectors;
        if (conns.length == 0) { return true }

        // Only single rolebox connection
        var allowed_single = [constrainttypes.role_value, 
                              constrainttypes.internal_freq];
        if (allowed_single.includes(ctd.type)) {
            if (conns.length > 0) { return false }
            if (d.kind != "rolebox") { return false }
            return true
        }

        // Connect to rolebox
        if (d.kind == "rolebox") {
            // Same type
            var roles = this.subtype_roles();
            if (roles.length > 0) { return false }

            // No double dipping
            roles = this.roles();
            if (roles.includes( d3target.attr("id") )) { return false }

            // Same entity
            if (ctd.type == constrainttypes.identifier || 
                ctd.type == constrainttypes.preferred_id ||
                ctd.type == constrainttypes.external_freq ) {
                // For identifiers and EF, match primary entity
                var fact_entity = d3.select(`#${d.parent}`).datum().entity_in; // Primary entity for fact
                if( fact_entity == d.entity ) { return false }
                var entities = this.primary_entities(); // Primary entities for this constraint
                if( entities.includes(fact_entity) ) { return true }
                return false
            }
            // Match entity of rolebox
            var entities = this.entities();
            if( entities.includes(d.entity) ) { return true }
            //else if( conns.length == 1 ) { return true }

            // Exception to same entity: neighboring rolebox
            var rboxIDs = this.neighbor_roles().map((r) => { return r.rboxID });
            if ( rboxIDs.includes(d3target.attr("id")) ) { 
                return true 
            }

            return false
        }

        // Connect to subtype
        if (d.kind == "connector") {
            // Same type
            var roles = this.roles();
            if (roles.length > 0) { return false }

            // No double dipping
            roles = this.subtype_roles();
            if (roles.includes( d3target.attr("id") )) { return false }

            // Only certain constraints
            if (!( ctd.type == constrainttypes.exclusion ||
                   ctd.type == constrainttypes.exclusive_or ||
                   ctd.type == constrainttypes.inclusive_or )) {
                return false
            }

            // Same entity
            var entities = this.entities();
            if( entities.includes(d.entity) ) { return true }
            
            return false
        }

        return false
    }

    /* End Connections */

}

/* Geometry transformations */

function point_on_circle(pos) {

    /* Find a point a distance r from a circle centered at (pos.x1, pos.y1)
       along a line pointing to (pos.x2, pos.y2). */

    
    var totalangle = Math.atan( ( pos.y2 - pos.y1 ) / ( pos.x2 - pos.x1 ) );
    if (pos.x1 > pos.x2) {totalangle += Math.PI; }

    return {x: pos.x1 + pos.r*Math.cos(totalangle), y: pos.y1 + pos.r*Math.sin(totalangle)}
    
}