/* 
    Convert metamodel to XML, following the .ORM format.

 */

var metamodel;

var parse_xml = false;

function display_xml() {

    if(!parse_xml) { return }

    var xml = (' ' + metamodel.XML).slice(1); // Deep copy
    xml = xml.replaceAll('<','&lt;').replaceAll('>','&gt;');

    // Display
    d3.select("#rel").html(`<pre><code class="language-xml">${xml}</code></pre>`);

}

function set_xml_parser() {
    if(d3.select("#parse_xml").property("checked")){
        parse_xml = true;
    } else {
        parse_xml = false;
    }
    display_rel();
    display_xml();
}