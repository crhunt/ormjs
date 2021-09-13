/*
    Everything related to relationships
*/

var svg;

function relationships_prototype(defs) {
    
    // Line type connection
    var gline = defs.append("g")
        .attr("id","rel_line_prototype")
        .attr("class","rel_line_prototype");
    
    gline.append("path")
         .attr("class","rel_line")
         .attr("d", d3.line()([ [0,0], [1,1] ]));
}

function draw_rel_line(x1, y1, x2, y2) {

    function remove_relationship(event) {
        if (event.defaultPrevented) return; // Drag
        if (event.ctrlKey) {
            // Remove the relationship visualization
            d3.select(this).remove();
            // Remove the relationship from records
        }
    }

    var drag = d3.drag()
        .on("start", rdragstarted)
        .on("drag", rdragged)
        .on("end",rdragended);
    
    // Draw the line
    line = svg.append("path")
              .datum( { x1: x1, y1: y1, x2: x2, y2: y2, selected: false,
                        from: "", to: "" } )
              //.attr("href","#rel_line_prototype")
              .attr("class","rel_line")
              .attr("d", d3.line()([ [x1,y1], [x2,y2] ]))
              .on("click", remove_relationship)
              .call(drag);

    return line;
}

function rdragstarted(event) { 
    event.sourceEvent.stopPropagation(); 
    d3.select(this).datum().selected = true;
}

function rdragged(event,d) {
    d.x2 = event.x;
    d.y2 = event.y;

    d3.select(this).attr("d", d3.line()([ [d.x1, d.y1], [d.x2, d.y2] ]));
}

function rdragended() {
    d3.select(this).datum().selected = false;
}
