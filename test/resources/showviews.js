function showViews() {
	var html = "";

	for (var key in $.views.viewStore) {
		if ($.views.viewStore[key]) {
			html += " " + key; // + ": " + getViews($.views.viewStore[key]);
		}
	}

	$("#views").html(html);
	return html.slice(2);
}

