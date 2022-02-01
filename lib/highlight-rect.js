var svg;

function svg_mousedown(event) {

    /* First actions to perform on a mousedown event on an
        overlay of an entity.
        
        The big trick here is that the entity is transformed to move the origin, 
        to the middle of the entity, but the pointer of the event doesn't know this 
        apparently. So we need to construct the actual location of the entity and 
        the click event. */
    
    //event.stopPropagation();

    var m = d3.pointer(event);

    hrect = svg.append("rect")
               .datum( {x1: m[0], y1: m[1], x2: m[0], y2: m[1]})
               .attr("class","highlight_rect")
               .attr("width", "1px")
               .attr("height", "1px")
               .attr("x", m[0])
               .attr("y", m[1])
               .attr("id","hrect");

    svg
       .on("mousemove", function (event) { hr_mousemove(event, hrect) })
       .on("mouseup", function (event) { hr_mouseup(event, hrect) } );
    
}

function hr_mousemove(event, hrect) {

    var m = d3.pointer(event);

    var d = hrect.datum();

    d.x2 = m[0];
    d.y2 = m[1];

    hrect
        .attr("width", () => { return Math.abs(d.x2 - d.x1) } )
        .attr("height", () => { return Math.abs(d.y2 - d.y1) } );
    
    if (d.x2 < d.x1 || d.y2 < d.y1) {
        hrect
            .attr("x", d.x2)
            .attr("y", d.y2)
    }
}

function hr_mouseup(event, hrect) {
    
    svg.on("mousemove", null).on("mouseup", null);

    hrect.remove();
}