// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg
var dragevent;
var conntypes;

// Distance tolerances for snap and link events
var tolerance; // Defined in graph-constructor
tolerance.link["constraint"] = parse_number( get_css_variable('--constraint-oradius') );
tolerance.snap["constraint"] = parse_number( get_css_variable('--constraint-radius') )/5;

class Constraint {

    d3object;
    id;
    param = {
        oradius : parse_number( get_css_variable('--constraint-oradius') ),
        radius : parse_number( get_css_variable('--constraint-radius') ),
        snapTolerance : parse_number( get_css_variable('--constraint-radius') )
    };

    constructor(x,y,d3object=false) {
        
        if(!d3object) {
            this.id = Constraint.generateID();
            this.create_d3object(x,y);

        } else {
            this.id = d3object.attr("id");
            this.d3object = d3object;
        }

        // Add actions
        this.actions();

        // Record object
        this.record();
    }

    static generateID() {
        var constID = "id-constraint-" + orm.highestConstID.toString();
        orm.highestConstID += 1;
        return constID
    }

    create_d3object(x,y) {
        
        var constraint = svg.append("g")
            .datum( { x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                      selected: false, connectors: [], connlimit: -1,
                      kind: "constraint", type: "inclusive-or",
                      deontic: false, loc: dragevent.locations } )
            .attr("class", "constraint_prototype")
            .attr("id", this.id)
            .attr("parent", this.id)
            .attr("x", x)
            .attr("y", y)
            .attr("width", 2*this.param.radius)
            .attr("height", 2*this.param.radius);

        constraint.append("circle")
            .attr("class", `overlay coverlay`)
            .attr("id", `o-${this.id}`)
            .attr("x", x)
            .attr("y", y)
            .attr("r", this.param.oradius);
            //.attr("transform", () => translate(-this.param.radius,-this.param.radius));
        
        constraint.append("circle")
            .attr("class", "constraint")
            .attr("id","c-"+this.id)
            .attr("x", x)
            .attr("y", y)
            .attr("r", this.param.radius);
            //.attr("transform", () => translate(-this.param.radius,-this.param.radius));

        this.d3object = constraint;
    }

    record() {
        orm.constraints[this.id] = this;
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
            .call(drag_constraint);

        // Overlay actions
        var overlay = d3.select(`#o-${this.id}`);
        overlay.on("mousedown", (event, d) => { this.mousedown(event, d, this); });
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

    mousedown(event, d, constraint) {
        
        event.stopPropagation();

        // Current pointer position
        var m = d3.pointer(event);
        var mousepos = { x: m[0] + d.x, y: m[1] + d.y };
        //var mousepos = { x: m[0] , y: m[1] };

        /* Old connector constructor 
        var conn = draw_conn_line(d.x, d.y, mousepos.x, mousepos.y, conntypes.CtoRB); */
        var pos = { x1: d.x, x2: mousepos.x, y1: d.y, y2: mousepos.y, conntype: conntypes.CtoRB};
        var conn = new Connector(pos);
        var cd = conn.d3object.datum();

        cd.from = constraint.id;
        cd.selected = true;
        conn.d3object.lower(); // Put beneath everything

        // Add svg mouse actions for dragging connector across svg
        // We unset these on mouseup (svg_mouseup).
        /*svg
            .on("mousemove", function (event) { svg_mousemove(event, conn) })
            .on("mouseup", function (event) { svg_mouseup(event, conn) } );*/
        svg
            .on("mousemove", function (event) { conn.svg_mousemove(event) })
            .on("mouseup", function (event) { conn.svg_mouseup(event) } );
    }

    /* End Actions */

    /* Connections */

    roles() {
        var conns = this.d3object.datum().connectors;
        var roles = conns.map( (connID) => {
            var cd = orm.connectors[connID].d3object.datum();
            if ( cd.conntype == conntypes.CtoRB ) { return cd.to }
        });

        return roles
    }

}