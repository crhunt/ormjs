/* 
    Convert metamodel to XML, following the .ORM format.

 */

// Note: TO DO: encapsulate!

function display_xml(model) {

    if(!model.generate_xml) { return }

    var xml = (' ' + model.metamodel.XML).slice(1); // Deep copy
    xml = xml.replaceAll('<','&lt;').replaceAll('>','&gt;');

    var targetID = model.xml_target;

    // Display
    d3.select(`#${targetID}`).html(`<pre><code class="language-xml">${xml}</code></pre>`);

}
