function BookConstructor()
{
	var currentPage = null;
	var _jumpStack = [];

	// § page visited
	// % variables
	// @ objects
	// $ special objects
	// # skills
	//   knowledges
	var _knowledges = {};

	var xmlDoc;
	var _directory;
	var _menuButtons = [];
	var _menuVisible = false;
	var TAG = {
		StartPage: "startPage",
		JumpPage: "jumpPage",

		CharacterPage: "characterPage",

		Title: "title",
		Image: "image",
		Series: "series",

		Destination: "page",
		Requirements: "require",
		Modifications: "modify"
	};

	var DefaultDestination = {
		Jump: "jumpDestination"
	};

	var _start = function(fileName, directory, saveData)
	{
		try
		{
			_directory = directory;
			System.readFile(fileName, function(fileContent)
			{
                xmlDoc = fileContent;
				if(!xmlDoc.firstChild)
				{
					xmlDoc = new DOMParser().parseFromString(fileContent,'text/xml');
				}

				var root = xmlDoc.firstChild;

				DefaultDestination.Jump = "jumpDestination";
				if(root.getAttribute(TAG.JumpPage))
				{
					DefaultDestination.Jump = root.getAttribute(TAG.JumpPage);
				}

				//Menu
				_menuButtons = [];
				var xPath = "/book/menu";
				var nodes = xmlDoc.evaluate(xPath, xmlDoc, null, XPathResult.ANY_TYPE, null);
				if(nodes)
				{
					var menu = nodes.iterateNext();
					if(menu)
					{
						for(var i = 0; i < menu.childNodes.length; i++)
						{
							if(menu.childNodes[i].tagName == "button")
							{
								_menuButtons.push({ Page: menu.childNodes[i].getAttribute("page"), Image: menu.childNodes[i].getAttribute("image"), Text: menu.childNodes[i].textContent });
							}
						}
					}
				}

				if(saveData)
				{
					_loadState(saveData);
				}
				else
				{
					_restart();
				}
			});
		}
		catch(e)
		{
			Log.error("Start: error " + e.message);
		}
	};

	var _restart = function()
	{
		_knowledges = {};
		_jumpStack = [];
		currentPage = null;

		_showPage(xmlDoc.firstChild.getAttribute(TAG.StartPage));
	};

	var _findXMLPageTag = function(xmldoc, pageId)
	{
		var xPath = "/book/page[@id='" + pageId + "']";
		var nodes = xmlDoc.evaluate(xPath, xmlDoc, null, XPathResult.ANY_TYPE, null);
		return nodes.iterateNext();
	};

	var _getAttribute = function(node, attributeName)
	{
		return _replaceVariables(node.getAttribute(attributeName));
	};

	var _addQuote = function(value)
	{
		if(value != null)
		{
			return "'" + value + "'";
		}
		return value;
	};

	var _showPage = function(page)
	{
		currentPage = page;
		try { // debug

		var root;

		_applyModifications("§" + page);
		root = _findXMLPageTag(xmlDoc, page);
		_applyModifications(_getAttribute(root, TAG.Modifications));

		//text
		var text = { page: "", modify: "", action: "", jumps: "", navigator: "" };
		
		//title
		var title = _getAttribute(root, TAG.Title);
		if(title)
		{
			text.page = "<div class='title'>" + title + "</div>";
		}

		for(var i = 0; i < root.childNodes.length; i++)
		{
			var node = root.childNodes[i];
			_renderNode(node, page, text);
		}

		var element;
		//page
	        element = document.getElementById("page");
		element.innerHTML = text.page;
		//area
	        element = document.getElementById("area");
		element.innerHTML = text.modify + text.action;
		//navigator
	        element = document.getElementById("navigator");
		element.innerHTML = text.jumps + text.navigator;

		} catch(e) { Log.debug("error: " + e.message.substring(e.message.lastIndexOf('>') + 1)); } // debug
	};

	var _renderNode = function(node, page, text)
	{
        var modifications;
		switch(node.tagName)
		{
			case "text":
			case "quote":
				if(_checkRequirements(_getAttribute(node, TAG.Requirements)))
				{
					modifications = _getAttribute(node, TAG.Modifications);
					if(_checkModificheRequirements(modifications))
					{
						//knowledge
						_applyModifications(modifications);
						var image = _getAttribute(node, TAG.Image);
						if(image)
						{
							text.page += '<div class="image"><img width="100%" src="' + _directory + image + '"></img></div>';
						}
						var tmp = _replaceVariables(node.textContent);
						if(tmp)
						{
							text.page += '<div class="' + node.tagName + '">' + tmp + '</div>';
						}
					}
				}
			break;
			case "jump":
				if(_checkRequirements(_getAttribute(node, TAG.Requirements)))
				{
					modifications = _getAttribute(node, TAG.Modifications);
					if(_checkModificheRequirements(modifications))
					{
						var destination = _getDestination(_getAttribute(node, TAG.Destination));
						if(destination == null)
						{
							destination = DefaultDestination.Jump;
						}
						text.jumps += '<div class="jump" onclick="Book.jumpToPage(\'' + destination + '\', ' + _addQuote(modifications) + ');">' + _replaceVariables(node.textContent) + '</div>';
					}
				}
			break;
			case "back":
				if(_checkRequirements(_getAttribute(node, TAG.Requirements)))
				{
					modifications = _getAttribute(node, TAG.Modifications);
					if(_checkModificheRequirements(modifications))
					{
						text.jumps += '<div class="jump" onclick="Book.backToPage(' + _addQuote(modifications) + ');">' + _replaceVariables(node.textContent) + '</div>';
					}
				}
			break;
			case "modify":
			case "action":
				if(_checkRequirements(_getAttribute(node, TAG.Requirements)))
				{
					modifications = _getAttribute(node, TAG.Modifications);
					if(_checkModificheRequirements(modifications))
					{
						var newPage = _getDestination(_getAttribute(node, TAG.Destination), page);
						if(node.tagName == "modify" || newPage == page)
						{
							text[node.tagName] += '<div class="' + node.tagName + '" onclick="Book.goToPage(\'' + page + '\', ' + _addQuote(modifications) + ')">' + _replaceVariables(node.textContent) + '</div>';
						}
						else
						{
							text.navigator += '<div class="goto" onclick="Book.goToPage(\'' + newPage + '\', ' + _addQuote(modifications) + ')">' + _replaceVariables(node.textContent) + '</div>';
						}
					}
				}
			break;
			case "group":
				if(_checkRequirements(_getAttribute(node, TAG.Requirements)))
				{
					for(var i = 0; i < node.childNodes.length; i++)
					{
						_renderNode(node.childNodes[i], page, text);
					}
				}
			break;
		}
	};

	var _getDestination = function(destinations, defaultPage)
	{
		if(destinations)
		{
			var tmp = destinations.split(" ");
			if(tmp.length > 1)
			{
				var randomnumber = Math.floor(Math.random() * tmp.length);
				return tmp[randomnumber];
			}
			else
			{
				return destinations;
			}
		}
		else
		{
			return defaultPage;
		}
	};

	var _goToPage = function(page, modifications)
	{
		_applyModifications(modifications);
		_showPage(page);
	};

	var _jumpToPage = function(page, modifications)
	{
		_jumpStack.push({ PreviousPage: currentPage, Type: "jump" });
		_applyModifications(modifications);
		_showPage(page);
	};

	var _backToPage = function(modifications)
	{
		var jump = _jumpStack.pop();
		_applyModifications(modifications);
		_showPage(jump.PreviousPage);
	};

	// name(x)  ->  >= x
	// !name(x) ->  <  x
	// =name(x) ->  == x
	var _checkRequirements = function(requirements)
	{
		var tmp = _splitItem(requirements);
		for(var i = 0; i < tmp.length; i++)
		{
			if(tmp[i].name[0] == '=')
			{
				if(_getValue(tmp[i].name.substr(1)) != tmp[i].value)
				{
					return false;
				}
			}
			else if(tmp[i].name[0] == '!')
			{
				if(_getValue(tmp[i].name.substr(1)) >= tmp[i].value)
				{
					return false;
				}
			}
			else
			{
				if(_getValue(tmp[i].name) < tmp[i].value)
				{
					return false;
				}
			}
		}
		return true;
	};

	var _checkModificheRequirements = function(modifications)
	{
		var tmp = _splitItem(modifications);
		for(var i = 0; i < tmp.length; i++)
		{
			if(tmp[i].name[0] == '-')
			{
				if(_getValue(tmp[i].name.substr(1)) < tmp[i].value)
				{
					return false;
				}
			}
		}
		return true;
	};

	// name(x)  ->  +x
	// -name(x) ->  -x
	// =name(x) ->  =x
	var _applyModifications = function(modifications)
	{
        var oldValue;
		var tmp = _splitItem(modifications);
		for(var i = 0; i < tmp.length; i++)
		{
			if(tmp[i].name[0] == '-')
			{
				oldValue = _getValue(tmp[i].name.substr(1));
				if(oldValue == null)
				{
					oldValue = -tmp[i].value;
				}
				else
				{
					oldValue -= tmp[i].value;
				}
				_setValue(tmp[i].name.substr(1), oldValue);
			}
			else if(tmp[i].name[0] == '=') //assegnamento
			{
				_setValue(tmp[i].name.substr(1), tmp[i].value);
			}
			else
			{
				oldValue = _getValue(tmp[i].name);
				if(oldValue == null)
				{
					oldValue = tmp[i].value;
				}
				else
				{
					oldValue += tmp[i].value;
				}
				_setValue(tmp[i].name, oldValue);
			}
		}
	};

	var _setValue = function(name, value)
	{
		_knowledges[name] = value;
	};

	var _getValue = function(name)
	{
		var ret = _knowledges[name];
		if(ret)
		{
			return ret;
		}
		return 0;
	};

	var _replaceVariables = function(data)
	{
		if(data != null)
		{
			var regEx=/\{.*?\}/g;
			var elements = data.match(regEx);
			if(elements)
			{
				for(var i = 0; i < elements.length; i++)
				{
					var val = _getValue(elements[i].slice(1, -1));
					data = data.replace(elements[i], val);
				}
			}
		}
		return data;
	};

	var _splitItem = function(data)
	{
		var ret = [];
		if(data != null)
		{
			var regEx=/\S+\(.*?\)|[^\(\s]+/g;
			var elements = data.match(regEx);
			if(elements)
			{
				for(var i = 0; i < elements.length; i++)
				{
					ret.push({ name: _parseName(elements[i]), value: _parseValue(elements[i]) });
				}
			}
		}
		return ret;
	};

	var _isNumber = function(n)
	{
		return !isNaN(parseFloat(n)) && isFinite(n);
	};

	var _parseValue = function(id)
	{
		var value = 1;
		if(id[id.length - 1] == ')')
		{
			value = _replaceVariables(id.substring(id.indexOf('(') + 1, id.length - 1));
			if(_isNumber(value))
			{
				value = parseInt(value);
			}
		}
		return value;
	};

	var _parseName = function(id)
	{
		var name = id;
		if(id[id.length - 1] == ')')
		{
			name = id.substring(0, id.indexOf('('));
		}
		return name;
	};

	var _saveState = function()
	{
		var tmp = "<state currentPage=\'" + currentPage + "\'>\n";
		tmp += "<knowledges>" + JSON.stringify(_knowledges) + "</knowledges>\n";
		tmp += "<jumpStack>" + JSON.stringify(_jumpStack) + "</jumpStack>\n";
		tmp += "</state>";
		return tmp;
	};

	var _loadState = function(xmlString)
	{
		var doc = new DOMParser().parseFromString(xmlString,'text/xml');
		_knowledges = eval('(' + doc.getElementsByTagName("knowledges")[0].textContent + ')');
		_jumpStack = eval('(' + doc.getElementsByTagName("jumpStack")[0].textContent + ')');
		_showPage(doc.getElementsByTagName("state")[0].getAttribute("currentPage"));
	};

	var _showMenu = function()
	{
		if((_menuButtons.length > 0) && ((_jumpStack.length == 0) || (_jumpStack[_jumpStack.length - 1].Type != "menu")))
		{
			var text = '';
			for(var i = 0; i < _menuButtons.length; i++)
			{
				text += '<div class="menuButton" onclick="Book.pressButton(\'' + _menuButtons[i].Page + '\');">' +
						'<img class="menuImage" src="' + _directory + _menuButtons[i].Image + '"></img>' +
						'<div class="menuText">' + _menuButtons[i].Text + '</div>' +
					'</div>';
			}
            var bookMenu = $("#bookMenu");
            bookMenu.html(text);

			$("#bookMenuBackground").removeClass("hide");
            bookMenu.removeClass("hide");

			_menuVisible = true;
		}
	};

	var _hideMenu = function()
	{
		if(_menuVisible)
		{
			$("#bookMenu").addClass("hide");
			$("#bookMenuBackground").addClass("hide");
			_menuVisible = false;
			return true;
		}
		return false;
	};

	var _pressButton = function(button)
	{
		_jumpStack.push({ PreviousPage: currentPage, Type: "menu" });
		_hideMenu();
		_goToPage(button);
	};

	var _backToBook = function()
	{
		if((_jumpStack.length > 0) && (_jumpStack[_jumpStack.length - 1].Type == "menu"))
		{
			_backToPage();
			return true;
		}
		return false;
	};

	this.backToBook = _backToBook;
	this.pressButton = _pressButton;
	this.showMenu = _showMenu;
	this.hideMenu = _hideMenu;
	this.goToPage = _goToPage;
	this.jumpToPage = _jumpToPage;
	this.backToPage = _backToPage;
	this.start = _start;
	this.restart = _restart;
	this.save = _saveState;
	this.load = _loadState;
}

var Book = new BookConstructor();