/**
 * Copyright (c) 2012 - 2014 TideSDK contributors 
 * http://www.tidesdk.org
 * Includes modified sources under the Apache 2 License
 * Copyright (c) 2008 - 2012 Appcelerator Inc
 * Refer to LICENSE for details of distribution and use.
 **/

// ==UserScript==
// @name	TideSDK App Tester
// @author	Software In Public Interest (SPI)
// @description	TideSDK Tests
// @include	app://org.tidesdk.unittest/index.html
// @version	0.1
// ==/UserScript==

<%
	function add_line_numbers(entry, fname) {
	  var f = entry.test[fname];
	  var code = String(f);
	  var lines = code.split("\n");
	  var ready = false;
	  var new_code = "";
	  for (var linenum = 0; linenum < lines.length; linenum++) {
	    var line = lines[linenum];
	    var idx = line.indexOf('should_');
	    if (idx != -1) {
	      var endIdx = line.lastIndexOf(')');
	      var absoluteLine = linenum + entry.line_offsets[fname] + 1;
	      if (line.charAt(endIdx - 1) == '(') {
	        line = line.substring(0, endIdx) + 'null,' + absoluteLine + ');';
	      } else {
	        line = line.substring(0, endIdx) + ',' + absoluteLine + ');';
	      }

	    }
	    new_code += line + "\n";
	  }

	  return new_code;
	}

	function make_function(entry, fname, scope) {
	  var f = entry.test[fname];
	  if (typeof (f) == 'function') {
	    if (typeof (scope) == 'undefined') {
	      return '(' + add_line_numbers(entry, fname) + ')();\n';
	    } else {
	      var expr = '(function(){var _scope = ' + scope + ';\n';
	      expr += '(' + add_line_numbers(entry, fname) + ').call(_scope,_scope);\n';
	      expr += '})();\n';
	      return expr;
	    }
	  }
	  return '';
	};%>

<%= Ti.Filesystem.getFile(Ti.App.appURLToPath('app://drillbit_func.js')).read() %>

Test.NAME = "<%= entry.name %>";
Test.SOURCE = "<%= entry.source_file.nativePath().replace(/\\/g, "\\\\") %>";
try {
	<%= make_function(entry, 'before_all', 'Test.gscope') %>
}
catch (e) {
	Ti.API.error('before_all caught error:'+e+' at line: '+e.line);
}

<% for (var f in entry.test) {
	var i = excludes.indexOf(f);
	var run = (entry.tests_to_run == "all" || entry.tests_to_run.indexOf(f) != -1);
	if (i == -1 && run) { %>

		Test.tests.push(function() {
			// <%= f %>
			var xscope = new Test.Scope('<%= f %>');
			<%= make_function(entry, 'before', 'xscope') %>;

			try {
				Test.currentTest = '<%= f %>';
				Test.runningTest('<%= entry.name %>', '<%= f %>');
				<%= make_function(entry, f, 'xscope') %>;
				<%
				i = f.indexOf('_as_async');
				if (i==-1)
				{ %>
					Test.testPassed('<%= f %>',Test.currentSubject.lineNumber);
				<% } %>
			}
			catch (___e) {
				// wrap the exception message so we can report the failed test's line number
				var ___err = {
					message: ___e.message || "Non-assertion exception: " + String(___e),
					line: ___e.constructor == Test.Error ? ___e.line : <%= entry.line_offsets[f] %>,
					toString: function() { return this.message; }
				};
				Test.testFailed('<%= f %>', ___err);
			}
			<%= make_function(entry, 'after', 'xscope') %>
			// --- <%= f %> ---
		});
<%	}
} %>

Test.on_complete = function() {
	try {
		<%= make_function(entry, 'after_all','Test.gscope') %>;
	}
	catch (e) {
		Ti.API.error('after_all caught error:'+e+' at line: '+e.line);
	}
	Test.complete();
};

Test.run_next_test();
