// ---

function SystemConstructor()
{
	var _fs;
	var _callback;

	var _initialize	= function(callback)
	{
		_callback = callback;
		try
		{
			window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
			if(window.requestFileSystem)
			{
				window.requestFileSystem(window.PERSISTENT, 0, _initFS, _errorHandler);
			}
			else if(_callback)
			{
				_callback();
			}
		}
		catch(e)
		{
			Log.error("Error: " + e.message);
		}
	};

	var _initFS = function(fs)
	{
		_fs = fs;
		if(_callback)
		{
			_callback();
		}
	};

	var _errorHandler = function(err)
	{
		switch (err.code)
		{
			case FileError.NOT_FOUND_ERR:
				Log.error("FileError.NOT_FOUND_ERR");
				break;
			case FileError.SECURITY_ERR:
				Log.error("FileError.SECURITY_ERR");
				break;
			case FileError.ABORT_ERR:
				Log.error("FileError.ABORT_ERR");
				break;
			case FileError.NOT_READABLE_ERR:
				Log.error("FileError.NOT_READABLE_ERR");
				break;
			case FileError.ENCODING_ERR:
				Log.error("FileError.ENCODING_ERR");
				break;
			case FileError.NO_MODIFICATION_ALLOWED_ERR:
				Log.error("FileError.NO_MODIFICATION_ALLOWED_ERR");
				break;
			case FileError.INVALID_STATE_ERR:
				Log.error("FileError.INVALID_STATE_ERR");
				break;
			case FileError.SYNTAX_ERR:
				Log.error("FileError.SYNTAX_ERR");
				break;
			case FileError.INVALID_MODIFICATION_ERR:
				Log.error("FileError.INVALID_MODIFICATION_ERR");
				break;
			case FileError.QUOTA_EXCEEDED_ERR:
				Log.error("FileError.QUOTA_EXCEEDED_ERR");
				break;
			case FileError.TYPE_MISMATCH_ERR:
				Log.error("FileError.TYPE_MISMATCH_ERR");
				break;
			case FileError.PATH_EXISTS_ERR:
				Log.error("FileError.PATH_EXISTS_ERR");
				break;
			default:
				Log.error("FileError: " + err.code);
				break;
		}
	};

	var _existFile = function(fileName, existCallback, notexistCallback)
	{
		if(_fs)
		{
			_fs.root.getFile(fileName, {create: false}, existCallback, notexistCallback);
		}
		else if(notexistCallback)
		{
			notexistCallback();
		}
	};

	var _writeFile = function(fileName, data, callback)
	{
		if(_fs)
		{
			_fs.root.getFile(fileName, {create: true}, function(fileEntry)
			{
				fileEntry.createWriter(function(fileWriter)
				{
					var blob = new Blob([data], {type:'text/plain'});
					fileWriter.write(blob);
					Log.debug('File successufully saved.');
					if(callback)
					{
						callback();
					}
				}, _errorHandler);
			}, _errorHandler);
		}
	};

	var _readFile = function(fileName, callback)
	{
		if(_fs)
		{
			_fs.root.getFile(fileName, {create: false}, function(fileEntry)
			{
				fileEntry.file(function(file)
				{
					var reader = new FileReader();
					reader.onloadend = function(e)
					{
						if(callback)
						{
							callback(this.result);
						}
					};
					reader.readAsText(file);
				}, _errorHandler);
			}, _errorHandler);
		}
	};

	var _deleteFile = function(fileName, callback)
	{
		if(_fs)
		{
			_fs.root.getFile(fileName, {create: false}, function(fileEntry)
			{
				fileEntry.remove(function()
				{
					Log.debug('File successufully removed.');
					if(callback)
					{
						callback();
					}
				}, _errorHandler);
			}, _errorHandler);
		}
	};
	
	var _renameFile = function(fileName, newFileName, callback)
	{
		if(_fs)
		{
			_fs.root.getFile(fileName, {create: false}, function(fileEntry)
			{
				var path = _decombinePath(newFileName);
				_fs.root.getDirectory(path.directory, {create: true}, function (dirEntry)
				{
					fileEntry.moveTo(dirEntry, path.fileName, function ()
					{
						Log.debug('File successufully renamed.');
						if(callback)
						{
							callback();
						}
					}, _errorHandler);
				}, _errorHandler);
			}, _errorHandler);
		}
	};

	var _decombinePath = function(fullName)
	{
		var ret = { directory: "", fileName: fullName };
		var index = fullName.lastIndexOf("\\");
		if(index == -1)
		{
			index = fullName.lastIndexOf("/");
		}
		if(index > -1)
		{
			ret.directory = fullName.substring(0, index);
			ret.fileName = fullName.substring(index + 1);
		}
		return ret;
	}
	
	var _existDirectory =  function(dirName, existCallback, notexistCallback)
	{
		if(_fs)
		{
			_fs.root.getDirectory(dirName, {create: false}, existCallback, notexistCallback);
		}
		else if(notexistCallback)
		{
			notexistCallback();
		}
	};

	var _createDirectory = function(dirName, callback)
	{
		if(_fs)
		{
			_fs.root.getDirectory(dirName, {create: true}, function(fileEntry)
			{
				Log.debug('Directory successufully created.');
				if(callback)
				{
					callback();
				}
			}, _errorHandler);
		}
	};

	var _deleteDirectory = function(dirName, callback)
	{
		if(_fs)
		{
			_fs.root.getDirectory(dirName, {create: false}, function(fileEntry)
			{
				fileEntry.removeRecursively(function()
				{
					Log.debug('Directory successufully removed.');
					if(callback)
					{
						callback();
					}
				}, _errorHandler);
			}, _errorHandler);
		}
	};

	var _listDirectory = function(dirName, callback)
	{
		if(_fs)
		{
			_fs.root.getDirectory(dirName, {create: true}, function(dirEntry)
			{
				var dirReader = dirEntry.createReader();
				dirReader.readEntries(function(entries)
				{
					var ret = [];
					for(var i = 0; i < entries.length; i++)
					{
						var entry = entries[i];
						if (entry.isDirectory)
						{
							ret.push(entry.name);
						}
					}

					if(callback)
					{
						callback(ret);
					}
				}, _errorHandler);
			}, _errorHandler);
		}
	};

	var _getDirectoryURL = function(dirName, callback)
	{
		if(_fs)
		{
			_fs.root.getDirectory(dirName, {create: true}, function(dirEntry)
			{
				if(callback)
				{
					callback(dirEntry.toURL());
				}
			});
		}
	};

	var _supportFileSystem = function()
	{
		return (window.requestFileSystem);
	};

	var _getFile = function(filename, dataType, callback)
	{
		$.ajax({ type: "GET", url: filename, dataType: dataType, success: callback });
	};
	
	var _createIfNotExists = function(baseDirectory, fileName, callback)
	{
		_existFile(baseDirectory + "/" + fileName, callback, function() {
			_createDirectory(baseDirectory, function() {
				_getTextFile(fileName, function(xml){
					_writeFile(baseDirectory + "/" + fileName, xml, callback);
				});
			});
		});
	};

	var _setScrollTop = function(position)
	{
		$(window).scrollTop(position);
	};
	
	var _getScrollTop = function()
	{
		return $(window).scrollTop();
	};
	
	this.setScrollTop = _setScrollTop;
	this.getScrollTop = _getScrollTop;
	
	this.getTextFile = function(filename, callback) { return _getFile(filename, "text", callback); };
	this.getXmlFile = function(filename, callback) { return _getFile(filename, "xml", callback); };
	this.getJsonFile = function(filename, callback) { return _getFile(filename, "json", callback); };
	this.createIfNotExists = _createIfNotExists;

	this.supportFileSystem = _supportFileSystem;
	this.initialize = _initialize;
	this.existFile = _existFile;
	this.writeFile = _writeFile;
	this.readFile = _readFile;
	this.deleteFile = _deleteFile;
	this.renameFile = _renameFile;
	this.existDirectory = _existDirectory;
	this.createDirectory = _createDirectory;
	this.deleteDirectory = _deleteDirectory;
	this.listDirectory = _listDirectory;
	this.getDirectoryURL = _getDirectoryURL;
}

var System = new SystemConstructor();
