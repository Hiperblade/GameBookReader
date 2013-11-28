function LibraryConstructor()
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
		if(_books.length == 0)
		{
			text += '<div>Non sono presenti libri nella cartella gamebook della scheda SD</div>';
		}
		else
		{
			for(var i = 0; i < _books.length; i++)
			{
				text += '<div class="book">';
				text += '<div class="bookRestart" onclick="Library.startBook(\'' + _books[i].Id + '\');">' +
						'<img class="bookImage" src="img/restart.svg" />' +
					'</div>';
				text += '<div class="bookArea" onclick="Library.continueBook(\'' + _books[i].Id + '\');">' +
						'<img class="bookImage" src="' + LIBRARY_IMAGE_DIRECTORY + '/' + _booksData[_books[i].Id].Directory + '/' + _books[i].Image + '"></img>' +
						'<div class="bookTextArea"><div class="bookTitle">' + _books[i].Title + '</div><div>' + _books[i].Series + '</div></div>' +
					'</div>' +
					'</div>';
			}
		}
		$("#mainPage").html(text);
	};

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
	};

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
			Image: image
		});

		_booksData[id] = {
			Directory: directory,
			SaveData: saveData
		};
	};

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
	};

	var _serializeLibrary = function()
	{
		var text = '<library>\n';
		for(var i = 0; i < _books.length; i++)
		{
			text += '<book id="' + _books[i].Id + '" title="' + _books[i].Title + '" series="' + _books[i].Series + '" image="' + _books[i].Image + '" directory="' + _booksData[_books[i].Id].Directory + '">' + _booksData[_books[i].Id].SaveData + '</book>';
		}
		text += '</library>';
		return text;
	};

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
                Log.debug("funzione non supportata");
			}
		}
		catch(e)
		{
			Log.error("Error: " + e.message);
		}
	};

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
	};

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
					}, function() { _updateLibrary(); });
				});

		}
		catch(e)
		{
			Log.error(e.message);
		}
	};

	var _suspendBook = function()
	{
		if(_currentBookId)
		{
			if(!Book.backToBook())
			{
				_booksData[_currentBookId].SaveData = Book.save();
				$("#book").addClass("hide");
				$("#main").removeClass("hide");

				_saveLibrary();

				_currentBookId = null;
			}
			return true;
		}
		return false;
	};
	
	var _startBook = function(id)
	{
		_booksData[id].SaveData = null;
		_continueBook(id);
	};

	var _continueBook = function(id)
	{
		_currentBookId = id;
		Book.start(LIBRARY_DIRECTORY + "/" + _booksData[_currentBookId].Directory + "/book.xml", LIBRARY_IMAGE_DIRECTORY + '/' + _booksData[_currentBookId].Directory + '/', _booksData[_currentBookId].SaveData);

		$("#main").addClass("hide");
		$("#book").removeClass("hide");
	};

	var _updateLibrary = function()
	{
		var i;
		System.listDirectory(LIBRARY_DIRECTORY, function(list)
		{
			for(i = 0; i < list.length; i++)
			{
				// se il libro non c'e' lo aggiungo
				var index = _findBook(list[i]);
				if(index == -1)
				{
					_addBook(list[i]);
				}
			}

			// elimino i libri non piu' presenti
			for(i = _books.length - 1; i >= 0; i--)
			{
				if(list.indexOf(_books[i].Id) < 0)
				{
					_booksData[_books[i].Id] = null;
					_books.splice(i, 1);
				}
			}

			_showBooks();
		});
	};

	var _showMenu = function()
	{
		if(_currentBookId)
		{
			Book.showMenu();
		}
	};

	var _hideMenu = function()
	{
		if(_currentBookId)
		{
			return Book.hideMenu();
		}
		return false;
	};

    var _backMenu = function()
    {
        // nascondo il menù se è aperto
        if(!_hideMenu())
        {
            // sospendo il libro se è aperto
            if(!_suspendBook())
            {
                return false;
            }
        }
        return true;
    };

	this.showMenu = _showMenu;
    this.backMenu = _backMenu;
	this.hideMenu = _hideMenu;
	this.updateLibrary = _updateLibrary;
	this.startBook = _startBook;
	this.continueBook = _continueBook;
	this.suspendBook = _suspendBook;
	this.start = _start;
}

var Library = new LibraryConstructor();