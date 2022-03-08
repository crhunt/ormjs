/* 
    Convert metamodel to XML, following the .ORM format.

 */

// Note: TO DO: encapsulate!

function display_xml(metamodel) {

    if(!ormjs.display.parse_xml) { return }

    var xml = (' ' + metamodel.XML).slice(1); // Deep copy
    xml = xml.replaceAll('<','&lt;').replaceAll('>','&gt;');

    // Display
    d3.select("#rel").html(`<pre><code class="language-xml">${xml}</code></pre>`);

}
