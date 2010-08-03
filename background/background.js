{ // Initialization
	var passwords = load();
	var jQuery = null;
	get('js/jquery-1.4.2.min.js', function(res){ jQuery = res; });
}

chrome.extension.onRequest.addListener(function(req, sender, sendResponse){
	if ('passwords' in req)
	{ // Options have been updated, new passwords available
		// Update local passwords
		passwords = req['passwords'];
		
		// Inform all tabs
		chrome.windows.getAll({ 'populate': true }, function(windows){
			for (i in windows){ for (j in windows[i].tabs){
				chrome.tabs.sendRequest(windows[i].tabs[j].id, {
					'passwords': passwords,
				})
			}}
		});
		sendResponse({});
	}
	
	else if ('init' in req)
	{ // A new tab wants to work with us, let's give it info
		if (sender.tab != null && /^http/.test(sender.tab.url))
			chrome.pageAction.show(sender.tab.id);
		sendResponse({
			'passwords': passwords,
			'supergenpass': supergenpass,
			'jquery': jQuery,
		});
	}
	
	else if ('password' in req)
	{ // A page wants to enter a password into a field
		var index = req['password'];
		if (!('password' in passwords[index]) && !('silent' in req))
		{ // The password has not yet been cached
			var stop = false;
			var second_attempt = false;
			while (!stop)
			{
				var entered = prompt_password(passwords[index], second_attempt);
				if (entered == null)
				{ // Cancelled
					stop = true;
				}
				else if (hash(entered) == passwords[index]['hash'])
				{ // Correct
					stop = true;
					passwords[index]['password'] = entered;
				}
				else
				{ // Wrong password
					second_attempt = true;
				}
			}
		}
		if ('password' in passwords[index])
		{
			if ('hostname' in req)
				var hostname = req['hostname']
			else
				var hostname = sender['tab']['url'];
			sendResponse({
				'hash': supergenpass(passwords[index]['password'], hostname, passwords[index]['len'])
			});
		}
		else
			sendResponse({});
	}
	
	else if ('store-password' in req)
	{ // A page actions wants us to store a password hash
		if ('index' in req)
			passwords[req['index']]['password'] = req['store-password'];
		else
			console.error('index is not in a request')
		sendResponse({});
	}
});

function prompt_password(password, second_attempt)
{
	var txt = '';
	if (second_attempt)
	{
		txt += chrome.i18n.getMessage('prompt_password_password') + ' "';
		txt += password['note'] + '" ' + chrome.i18n.getMessage('prompt_password_is_incorrect') + '\n\n';
		txt += chrome.i18n.getMessage('try_again') + ':';
	}
	else
	{
		txt += chrome.i18n.getMessage('prompt_password_password') + ' "';
		txt += password['note'] + '" '+ chrome.i18n.getMessage('prompt_password_is_locked') +'\n';
		txt += chrome.i18n.getMessage('prompt_password_please_unlock');
	}
	return prompt(txt)
}

function get(src, callback)
{
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {if (xhr.readyState == 3){
		callback(xhr.responseText);
	}};
	xhr.open('GET', chrome.extension.getURL(src), true);
	xhr.send();
}