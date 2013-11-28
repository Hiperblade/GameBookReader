function Book()
{
	var currentPage = null;
	var _knowledges = {};		//
	var _variables = {};		// %
	var _objects = {};		// @
	var _specialObjects = {};	// $
	var _skills = {};		// #

	var xmlDoc;
	var _directory;
	var TAG = {
		StartPage: "startPage",
		JumpPage: "jumpPage",

		CharacterPage: "characterPage",

		Title: "title",
		Image: "image",
		Series: "series",

		Destination: "page",
		Requirements: "require",
		Modifications: "modify",
	}

	var DefaultDestination = {
		Jump: "jumpDestination",
	}

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

				var xmlS = new XMLSerializer();
				var root = xmlDoc.firstChild;

				//Pagina del personaggio: xmlDoc.firstChild.getAttribute(TAG.CharacterPage);
				DefaultDestination.Jump = "jumpDestination";
				if(root.getAttribute(TAG.JumpPage))
				{
					DefaultDestination.Jump = root.getAttribute(TAG.JumpPage);
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
	}

	var _restart = function()
	{
		_knowledges = {};
		_variables = {};
		_objects = {};
		_specialObjects = {};
		_skills = {};
		currentPage = null;

		_showPage(xmlDoc.firstChild.getAttribute(TAG.StartPage));
	}

	var _findXMLPageTag = function(xmldoc, pageId)
	{
		var xPath = "/book/page[@id='" + pageId + "']";
		var nodes = xmlDoc.evaluate(xPath, xmlDoc, null, XPathResult.ANY_TYPE, null);
		return nodes.iterateNext();
	}

	var _getAttribute = function(node, attributeName)
	{
		return _replaceVariables(node.getAttribute(attributeName));
	}

	var _addQuote = function(value)
	{
		if(value != null)
		{
			return "'" + value + "'";
		}
		return value;
	}

	var _showPage = function(page)
	{
		currentPage = page;
		try { // debug

		var root;
		var image;

		_applyModifications(page + " =§CurrentPage(" + page + ")");
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
	}

	var _renderNode = function(node, page, text)
	{
		switch(node.tagName)
		{
			case "text":
			case "quote":
				if(_checkRequirements(_getAttribute(node, TAG.Requirements)))
				{
					var modifications = _getAttribute(node, TAG.Modifications);
					if(_checkModificheRequirements(modifications))
					{
						//knowledge
						_applyModifications(modifications);
						image = _getAttribute(node, TAG.Image);
						if(image)
						{
							text.page += '<div class="image"><img width="100%" src="' + _directory + image + '"></img></div>';
						}
						text.page += '<div class="' + node.tagName + '">' + _replaceVariables(node.textContent) + '</div>';
					}
				}
			break;
			case "jump":
				if(_checkRequirements(_getAttribute(node, TAG.Requirements)))
				{
					var modifications = _getAttribute(node, TAG.Modifications);
					if(_checkModificheRequirements(modifications))
					{
						var destination = _getDestination(_getAttribute(node, TAG.Destination));
						if(destination == null)
						{
							destination = DefaultDestination.Jump;
						}

						var modificationsNew = "=§PreviousPage(" + page + ")";
						if(modifications)
						{
							modificationsNew += " " + modifications;
						}
						text.jumps += '<div class="jump" onclick="Book.gotoPage(\'' + destination + '\', ' + _addQuote(modificationsNew) + ');">' + _replaceVariables(node.textContent) + '</div>';
					}
				}
			break;
			case "modify":
			case "action":
				if(_checkRequirements(_getAttribute(node, TAG.Requirements)))
				{
					var modifications = _getAttribute(node, TAG.Modifications);
					if(_checkModificheRequirements(modifications))
					{
						var newPage = _getDestination(_getAttribute(node, TAG.Destination), page);
						if(node.tagName == "modify" || newPage == page)
						{
							text[node.tagName] += '<div class="' + node.tagName + '" onclick="Book.gotoPage(\'' + page + '\', ' + _addQuote(modifications) + ')">' + _replaceVariables(node.textContent) + '</div>';
						}
						else
						{
							text.navigator += '<div class="goto" onclick="Book.gotoPage(\'' + newPage + '\', ' + _addQuote(modifications) + ')">' + _replaceVariables(node.textContent) + '</div>';
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
	}

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
	}

	var _gotoPage = function(page, modifications)
	{
		_applyModifications(modifications);
		_showPage(page);
	}

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
	}

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
	}

	// name(x)  ->  +x
	// -name(x) ->  -x
	// =name(x) ->  =x
	var _applyModifications = function(modifications)
	{
		var tmp = _splitItem(modifications);
		for(var i = 0; i < tmp.length; i++)
		{
			if(tmp[i].name[0] == '-')
			{
				var oldValue = _getValue(tmp[i].name.substr(1));
				if(oldValue == null)
				{
					oldValue = tmp[i].value;
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
				var oldValue = _getValue(tmp[i].name);
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
	}

	var _setValue = function(name, value)
	{
		if(name[0] == '%')
		{
			_variables[name] = value;
		}
		else if(name[0] == '#')
		{
			_skills[name] = value;
		}
		else if(name[0] == '$')
		{
			_specialObjects[name] = value;
		}
		else if(name[0] == '@')
		{
			_objects[name] = value;
		}
		else
		{
			_knowledges[name] = value;
		}
	}

	var _getValue = function(name)
	{
		var ret;
		if(name[0] == '%')
		{
			ret = _variables[name];
		}
		else if(name[0] == '#')
		{
			ret = _skills[name];
		}
		else if(name[0] == '$')
		{
			ret = _specialObjects[name];
		}
		else if(name[0] == '@')
		{
			ret = _objects[name];
		}
		else
		{
			ret = _knowledges[name];
		}
		if(ret)
		{
			return ret;
		}
		return 0;
	}

	var _replaceVariables = function(data)
	{
		if(data != null)
		{
			var regEx=/\{.*?\}/g;
			elements = data.match(regEx);
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
	}

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
	}

	var _isNumber = function(n)
	{
		return !isNaN(parseFloat(n)) && isFinite(n);
	}

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
	}

	var _parseName = function(id)
	{
		var name = id;
		if(id[id.length - 1] == ')')
		{
			name = id.substring(0, id.indexOf('('));
		}
		return name;
	}

	var _saveState = function()
	{
		var tmp = "<state currentPage=\'" + currentPage + "\'>\n";
		tmp += "<knowledges>" + JSON.stringify(_knowledges) + "</knowledges>\n";
		tmp += "<variables>" + JSON.stringify(_variables) + "</variables>\n";
		tmp += "<objects>" + JSON.stringify(_objects) + "</objects>\n";
		tmp += "<specialObjects>" + JSON.stringify(_specialObjects) + "</specialObjects>\n";
		tmp += "<skills>" + JSON.stringify(_skills) + "</skills>\n";
		tmp += "</state>";
		return tmp;
	}

	var _loadState = function(xmlString)
	{
		var doc = new DOMParser().parseFromString(xmlString,'text/xml');
		_knowledges = eval('(' + doc.getElementsByTagName("knowledges")[0].textContent + ')');
		_variables = eval('(' + doc.getElementsByTagName("variables")[0].textContent + ')');
		_objects = eval('(' + doc.getElementsByTagName("objects")[0].textContent + ')');
		_specialObjects = eval('(' + doc.getElementsByTagName("specialObjects")[0].textContent + ')');
		_skills = eval('(' + doc.getElementsByTagName("skills")[0].textContent + ')');
		_showPage(doc.getElementsByTagName("state")[0].getAttribute("currentPage"));
	}

	this.gotoPage = _gotoPage;

	this.start = _start;
	this.restart = _restart;
	this.save = _saveState;
	this.load = _loadState;
}

Book = new Book();

function Library()
{
	var LIBRARY_IMAGE_DIRECTORY = "file:///";
	var LIBRARY_DIRECTORY = "gamebook";
	var LIBRARY_FILE = LIBRARY_DIRECTORY + "/library.xml";

	var xmlDoc = null;

	var _books = [];
	var _booksData = {};
	var _currentBookId = null;

	var _showBooks = function()
	{
		var text = '';
		for(var i = 0; i < _books.length; i++)
		{
			text += '<div class="book">';
			text += '<div class="bookRestart" onclick="Library.startBook(\'' + _books[i].Id + '\');">' +
					'<img class="bookImage" src="img/restart.svg"></img>' +
				'</div>';
			text += '<div class="bookArea" onclick="Library.continueBook(\'' + _books[i].Id + '\');">' +
					'<img class="bookImage" src="' + LIBRARY_IMAGE_DIRECTORY + '/' + _booksData[_books[i].Id].Directory + '/' + _books[i].Image + '"></img>' +
					'<div class="bookTextArea"><div class="bookTitle">' + _books[i].Title + '</div><div>' + _books[i].Series + '</div></div>' +
				'</div>' +
				'</div>';
		}
		$("#mainPage").html(text);

		text = '<div class="menuButton" onclick="Library.suspendBook();">' +
				'<img class="menuImage" src="img/menu.svg"></img>' +
			'</div>';
		$("#bookMenu").html(text);
	}

	var _findBook = function(id)
	{
		for(var i = 0; i < _books.length; i++)
		{
			if(_books[i].Id == id)
			{
				return i;
			}
		}
		return -1;
	}

	var _internalAddBook = function(id, title, series, image, directory, saveData)
	{
		var index = _findBook(id);
		if(index > -1)
		{
			_books.splice(index, 1);
			_booksData[id] = null;
		}

		_books.push({
			Id: id,
			Title: title,
			Series: series,
			Image: image,
		});

		_booksData[id] = {
			Directory: directory,
			SaveData: saveData,
		};
	}

	var _addBook = function(directory)
	{
		var fileName = LIBRARY_DIRECTORY + "/" + directory + "/book.xml";
		System.existFile(fileName, function()
		{
			System.readFile(fileName, function(fileContent)
			{
				var xmlTmp = fileContent;
				if(!xmlTmp.firstChild)
				{
					xmlTmp = new DOMParser().parseFromString(fileContent,'text/xml');
				}

				var xmlS = new XMLSerializer();
				var root = xmlTmp.firstChild;

				_internalAddBook(
						root.getAttribute("id"),
						root.getAttribute("title"),
						root.getAttribute("series"),
						root.getAttribute("image"),
						directory,
						null);

				_showBooks();
			});
		});
	}

	var _serializeLibrary = function()
	{
		var text = '<library>\n';
		for(var i = 0; i < _books.length; i++)
		{
			text += '<book id="' + _books[i].Id + '" title="' + _books[i].Title + '" series="' + _books[i].Series + '" image="' + _books[i].Image + '" directory="' + _booksData[_books[i].Id].Directory + '">' + _booksData[_books[i].Id].SaveData + '</book>';
		}
		text += '</library>';
		return text;
	}

	var _saveLibrary = function()
	{
		try
		{
			if(window.requestFileSystem)
			{
				System.createDirectory(LIBRARY_DIRECTORY, function()
				{
					System.writeFile(LIBRARY_FILE, _serializeLibrary());
				});
			}
			else
			{
				//funzione non supportata
				_debug("funzione non supportata");
			}
		}
		catch(e)
		{
			Log.error("Error: " + e.message);
		}
	}

	var _deserializeLibrary = function(data)
	{
		xmlDoc = data;
		if(!xmlDoc.firstChild)
		{
			xmlDoc = new DOMParser().parseFromString(data,'text/xml');
		}

		var xmlS = new XMLSerializer();
		var root = xmlDoc.firstChild;
		for(var i = 0; i < root.childNodes.length; i++)
		{
			var node = root.childNodes[i];
			if(node.getAttribute)
			{
				var saveData;
				for(var ii = 0; ii < node.childNodes.length; ii++)
				{
					if(node.childNodes[ii].getAttribute)
					{
						saveData = xmlS.serializeToString(node.childNodes[ii]);
						break;
					}
				}
				_internalAddBook(
					node.getAttribute("id"),
					node.getAttribute("title"),
					node.getAttribute("series"),
					node.getAttribute("image"),
					node.getAttribute("directory"),
					saveData
				);
			}
		}

		_updateLibrary();
	}

	var _start = function()
	{
		try
		{
			System.getDirectoryURL(LIBRARY_DIRECTORY, function(url)
				{
				LIBRARY_IMAGE_DIRECTORY = url;
				System.existFile(LIBRARY_FILE,
					function()
					{
						System.readFile(LIBRARY_FILE, function(fileContent)
						{
							_deserializeLibrary(fileContent);
						});
					}, function() { });
				});

		}
		catch(e)
		{
			Log.error(e.message);
		}
	}

	var _suspendBook = function()
	{
		if(_currentBookId)
		{
			_booksData[_currentBookId].SaveData = Book.save();
			$("#book").addClass("hide");
			$("#main").removeClass("hide");

			_saveLibrary();
		}
	}
	
	var _startBook = function(id)
	{
		_booksData[id].SaveData = null;
		_continueBook(id);
	}

	var _continueBook = function(id)
	{
		_currentBookId = id;
		Book.start(LIBRARY_DIRECTORY + "/" + _booksData[id].Directory + "/book.xml", LIBRARY_IMAGE_DIRECTORY + '/' + _booksData[id].Directory + '/', _booksData[id].SaveData);
		$("#main").addClass("hide");
		$("#book").removeClass("hide");
	}

	var _updateLibrary = function()
	{
		var tmp = [];
		System.listDirectory(LIBRARY_DIRECTORY, function(list)
		{
			for(var i = 0; i < list.length; i++)
			{
				// se il libro non c'e' lo aggiungo
				var index = _findBook(list[i]);
				if(index == -1)
				{
					_addBook(list[i]);
				}
			}

			// elimino i libri non piu' presenti
			for(var i = _books.length - 1; i >= 0; i--)
			{
				if(list.indexOf(_books[i].Id) < 0)
				{
					_booksData[_books[i].Id] = null;
					_books.splice(i, 1);
				}
			}

			_showBooks();
		});
	}

	this.updateLibrary = _updateLibrary;
	this.startBook = _startBook;
	this.continueBook = _continueBook;
	this.suspendBook = _suspendBook;
	this.start = _start;
}

Library = new Library();
