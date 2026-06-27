'use strict';
'require view';
'require form';
'require ui';
'require network';
'require fs';

return view.extend({
    async render() {
        var m, s, o;

        // Fetch installed component versions for the Diagnostics header.
        var versionInfo = null;
        try {
            const vres = await fs.exec('/etc/init.d/podkop', ['get_system_info']);
            if (vres && vres.code === 0 && vres.stdout) {
                versionInfo = JSON.parse(vres.stdout);
            }
        } catch (e) {
            versionInfo = null;
        }

        m = new form.Map('podkop', _('Podkop configuration'), null, ['main', 'second', 'third']);

        s = m.section(form.TypedSection, 'main');
        s.anonymous = true;

        // Basic Settings Tab
        o = s.tab('basic', _('Basic Settings'));

        o = s.taboption('basic', form.ListValue, 'mode', _('Connection Type'), _('Select between VPN and Proxy connection methods for traffic routing'));
        o.value('vpn', ('VPN'));
        o.value('proxy', ('Proxy'));
        o.ucisection = 'main';

        o = s.taboption('basic', form.ListValue, 'proxy_config_type', _('Configuration Type'), _('Select how to configure the proxy'));
        o.value('url', _('Connection URL'));
        o.value('outbound', _('Outbound Config'));
        o.default = 'url';
        o.depends('mode', 'proxy');
        o.ucisection = 'main';

        o = s.taboption('basic', form.TextValue, 'proxy_string', _('Proxy Configuration URL'), _('Enter connection string starting with vless:// or ss:// for proxy configuration'));
        o.depends('proxy_config_type', 'url');
        o.rows = 5;
        o.ucisection = 'main';

        o = s.taboption('basic', form.TextValue, 'outbound_json', _('Outbound Configuration'), _('Enter complete outbound configuration in JSON format'));
        o.depends('proxy_config_type', 'outbound');
        o.rows = 10;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            try {
                const parsed = JSON.parse(value);
                if (!parsed.type || !parsed.server || !parsed.server_port) {
                    return _('JSON must contain at least type, server and server_port fields');
                }
                return true;
            } catch (e) {
                return _('Invalid JSON format');
            }
        };

        o = s.taboption('basic', form.ListValue, 'interface', _('Network Interface'), _('Select network interface for VPN connection'));
        o.depends('mode', 'vpn');
        o.ucisection = 'main';

        try {
            const devices = await network.getDevices();
            const excludeInterfaces = ['br-lan', 'eth0', 'eth1', 'wan', 'phy0-ap0', 'phy1-ap0'];

            devices.forEach(function (device) {
                if (device.dev && device.dev.name) {
                    const deviceName = device.dev.name;
                    const isExcluded = excludeInterfaces.includes(deviceName) || /^lan\d+$/.test(deviceName);

                    if (!isExcluded) {
                        o.value(deviceName, deviceName);
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching devices:', error);
        }

        o = s.taboption('basic', form.Flag, 'domain_list_enabled', _('Community Domain Lists'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.ListValue, 'domain_list', _('Domain List'), _('Select a list') + ' <a href="https://github.com/itdoginfo/allow-domains" target="_blank">github.com/itdoginfo/allow-domains</a>');
        o.placeholder = 'placeholder';
        o.value('ru_inside', 'Russia inside');
        o.value('ru_outside', 'Russia outside');
        o.value('ua', 'Ukraine');
        o.depends('domain_list_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.Flag, 'delist_domains_enabled', _('Domain Exclusions'), _('Exclude specific domains from routing rules'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'main';
        o.depends('domain_list_enabled', '1');

        o = s.taboption('basic', form.DynamicList, 'delist_domains', _('Excluded Domains'), _('Domains to be excluded from routing'));
        o.placeholder = 'Delist domains';
        o.depends('delist_domains_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.Flag, 'subnets_list_enabled', _('Community Subnet Lists'), _('Enable routing for popular services like Twitter, Meta, and Discord'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.DynamicList, 'subnets', _('Service Networks'), _('Select predefined service networks for routing'));
        o.placeholder = 'Service network list';
        o.value('twitter', 'Twitter(x.com)');
        o.value('meta', 'Meta');
        o.value('discord', 'Discord(voice)');
        o.depends('subnets_list_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.ListValue, 'custom_domains_list_enabled', _('User Domain List Type'), _('Select how to add your custom domains'));
        o.value('disabled', _('Disabled'));
        o.value('dynamic', _('Dynamic List'));
        o.value('text', _('Text List'));
        o.default = 'disabled';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.DynamicList, 'custom_domains', _('User Domains'), _('Enter domain names without protocols (example: sub.example.com or example.com)'));
        o.placeholder = 'Domains list';
        o.depends('custom_domains_list_enabled', 'dynamic');
        o.rmempty = false;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const domainRegex = /^(?!-)[A-Za-z0-9-]+([-.][A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

            if (!domainRegex.test(value)) {
                return _('Invalid domain format. Enter domain without protocol (example: sub.example.com)');
            }
            return true;
        };

        o = s.taboption('basic', form.TextValue, 'custom_domains_text', _('User Domains List'), _('Enter domain names separated by comma, space or newline (example: sub.example.com, example.com or one domain per line)'));
        o.placeholder = 'example.com, sub.example.com\ndomain.com test.com\nsubdomain.domain.com another.com, third.com';
        o.depends('custom_domains_list_enabled', 'text');
        o.rows = 10;
        o.rmempty = false;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const domains = value.split(/[,\s\n]/)
                .map(d => d.trim())
                .filter(d => d.length > 0);

            const domainRegex = /^(?!-)[A-Za-z0-9-]+([-.][A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

            for (const domain of domains) {
                if (!domainRegex.test(domain)) {
                    return _('Invalid domain format: ' + domain + '. Enter domain without protocol');
                }
            }
            return true;
        };

        o = s.taboption('basic', form.Flag, 'custom_local_domains_list_enabled', _('Local Domain Lists'), _('Use the list from the router filesystem'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.DynamicList, 'custom_local_domains', _('Local Domain Lists Path'), _('Enter to the list file path'));
        o.placeholder = '/path/file.lst';
        o.depends('custom_local_domains_list_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            try {
                const pathRegex = /^\/[a-zA-Z0-9_\-\/\.]+$/;
                if (!pathRegex.test(value)) {
                    throw new Error(_('Invalid path format. Path must start with "/" and contain only valid characters (letters, numbers, "-", "_", "/", ".")'));
                }
                return true;
            } catch (e) {
                return _('Invalid path format');
            }
        };

        o = s.taboption('basic', form.Flag, 'custom_download_domains_list_enabled', _('Remote Domain Lists'), _('Download and use domain lists from remote URLs'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.DynamicList, 'custom_download_domains', _('Remote Domain URLs'), _('Enter full URLs starting with http:// or https://'));
        o.placeholder = 'URL';
        o.depends('custom_download_domains_list_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            try {
                const url = new URL(value);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    return _('URL must use http:// or https:// protocol');
                }
                return true;
            } catch (e) {
                return _('Invalid URL format. URL must start with http:// or https://');
            }
        };


        o = s.taboption('basic', form.ListValue, 'custom_subnets_list_enabled', _('User Subnet List Type'), _('Select how to add your custom subnets'));
        o.value('disabled', _('Disabled'));
        o.value('dynamic', _('Dynamic List'));
        o.value('text', _('Text List (comma/space/newline separated)'));
        o.default = 'disabled';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.DynamicList, 'custom_subnets', _('User Subnets'), _('Enter subnets in CIDR notation (example: 103.21.244.0/22) or single IP addresses'));
        o.placeholder = 'IP or subnet';
        o.depends('custom_subnets_list_enabled', 'dynamic');
        o.rmempty = false;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

            if (!subnetRegex.test(value)) {
                return _('Invalid format. Use format: X.X.X.X or X.X.X.X/Y');
            }

            // Разбираем IP и маску
            const [ip, cidr] = value.split('/');
            const ipParts = ip.split('.');

            for (const part of ipParts) {
                const num = parseInt(part);
                if (num < 0 || num > 255) {
                    return _('IP address parts must be between 0 and 255');
                }
            }

            if (cidr !== undefined) {
                const cidrNum = parseInt(cidr);
                if (cidrNum < 0 || cidrNum > 32) {
                    return _('CIDR must be between 0 and 32');
                }
            }

            return true;
        };

        o = s.taboption('basic', form.TextValue, 'custom_subnets_text', _('User Subnets List'), _('Enter subnets in CIDR notation or single IP addresses, separated by comma, space or newline'));
        o.placeholder = '103.21.244.0/22\n8.8.8.8\n1.1.1.1/32, 9.9.9.9 10.10.10.10';
        o.depends('custom_subnets_list_enabled', 'text');
        o.rows = 10;
        o.rmempty = false;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            // Split by commas, spaces and newlines
            const subnets = value.split(/[,\s\n]/)
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

            for (const subnet of subnets) {
                if (!subnetRegex.test(subnet)) {
                    return _('Invalid format: ' + subnet + '. Use format: X.X.X.X or X.X.X.X/Y');
                }

                const [ip, cidr] = subnet.split('/');
                const ipParts = ip.split('.');

                for (const part of ipParts) {
                    const num = parseInt(part);
                    if (num < 0 || num > 255) {
                        return _('IP parts must be between 0 and 255 in: ' + subnet);
                    }
                }

                if (cidr !== undefined) {
                    const cidrNum = parseInt(cidr);
                    if (cidrNum < 0 || cidrNum > 32) {
                        return _('CIDR must be between 0 and 32 in: ' + subnet);
                    }
                }
            }
            return true;
        };

        o = s.taboption('basic', form.Flag, 'custom_download_subnets_list_enabled', _('Remote Subnet Lists'), _('Download and use subnet lists from remote URLs'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.DynamicList, 'custom_download_subnets', _('Remote Subnet URLs'), _('Enter full URLs starting with http:// or https://'));
        o.placeholder = 'URL';
        o.depends('custom_download_subnets_list_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            try {
                const url = new URL(value);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    return _('URL must use http:// or https:// protocol');
                }
                return true;
            } catch (e) {
                return _('Invalid URL format. URL must start with http:// or https://');
            }
        };

        o = s.taboption('basic', form.Flag, 'all_traffic_from_ip_enabled', _('IP for full redirection'), _('Specify local IP addresses whose traffic will always use the configured route'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.DynamicList, 'all_traffic_ip', _('Local IPs'), _('Enter valid IPv4 addresses'));
        o.placeholder = 'IP';
        o.depends('all_traffic_from_ip_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

            if (!ipRegex.test(value)) {
                return _('Invalid IP format. Use format: X.X.X.X (like 192.168.1.1)');
            }

            const ipParts = value.split('.');
            for (const part of ipParts) {
                const num = parseInt(part);
                if (num < 0 || num > 255) {
                    return _('IP address parts must be between 0 and 255');
                }
            }

            return true;
        };

        o = s.taboption('basic', form.Flag, 'exclude_from_ip_enabled', _('IP for exclusion'), _('Specify local IP addresses that will never use the configured route'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('basic', form.DynamicList, 'exclude_traffic_ip', _('Local IPs'), _('Enter valid IPv4 addresses'));
        o.placeholder = 'IP';
        o.depends('exclude_from_ip_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'main';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

            if (!ipRegex.test(value)) {
                return _('Invalid IP format. Use format: X.X.X.X (like 192.168.1.1)');
            }

            const ipParts = value.split('.');
            for (const part of ipParts) {
                const num = parseInt(part);
                if (num < 0 || num > 255) {
                    return _('IP address parts must be between 0 and 255');
                }
            }

            return true;
        };

        // Additional Settings Tab

        o = s.tab('additional', _('Additional Settings'));

        o = s.taboption('additional', form.Flag, 'yacd', _('Yacd enable'), _('http://openwrt.lan:9090/ui'));
        o.default = '0';
        o.depends('mode', 'proxy');
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('additional', form.Flag, 'socks5', _('Mixed enable'), _('Browser port: 2080'));
        o.default = '0';
        o.depends('mode', 'proxy');
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('additional', form.Flag, 'download_via_main', _('Download lists via main tunnel'), _('Fetch remote domain/subnet lists through the main proxy tunnel (useful when GitHub is blocked by your ISP)'));
        o.default = '0';
        o.depends('mode', 'proxy');
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('additional', form.Flag, 'exclude_ntp', _('Exclude NTP'), _('For issues with open connections sing-box'));
        o.default = '0';
        o.depends('mode', 'proxy');
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('additional', form.ListValue, 'log_level', _('Log Level'), _('Debug enables verbose logging to the system log and /tmp/podkop.log'));
        o.value('normal', _('Normal'));
        o.value('debug', _('Debug (verbose)'));
        o.default = 'normal';
        o.rmempty = false;
        o.ucisection = 'main';

        o = s.taboption('additional', form.ListValue, 'update_interval', _('List Update Frequency'), _('Select how often the lists will be updated'));
        o.value('0 */1 * * *', _('Every hour'));
        o.value('0 */2 * * *', _('Every 2 hours'));
        o.value('0 */4 * * *', _('Every 4 hours'));
        o.value('0 */6 * * *', _('Every 6 hours'));
        o.value('0 */12 * * *', _('Every 12 hours'));
        o.value('0 4 * * *', _('Once a day at 04:00'));
        o.value('0 4 * * 0', _('Once a week on Sunday at 04:00'));
        o.default = '0 4 * * *';
        o.rmempty = false;
        o.ucisection = 'main';

        // Secondary Settings Tab

        o = s.tab('secondary_config', _('Secondary Config'));

        o = s.taboption('secondary_config', form.Flag, 'second_enable', _('Secondary VPN/Proxy Enable'), _('Enable secondary VPN/Proxy configuration'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'second';

        o = s.taboption('secondary_config', form.ListValue, 'second_mode', _('Connection Type'), _('Select between VPN and Proxy connection methods for traffic routing'));
        o.value('vpn', ('VPN'));
        o.value('proxy', ('Proxy'));
        o.depends('second_enable', '1');
        o.ucisection = 'second';

        o = s.taboption('secondary_config', form.ListValue, 'second_proxy_config_type', _('Configuration Type'), _('Select how to configure the proxy'));
        o.value('url', _('Connection URL'));
        o.value('outbound', _('Outbound Config'));
        o.default = 'url';
        o.depends('second_mode', 'proxy');
        o.ucisection = 'second';

        o = s.taboption('secondary_config', form.TextValue, 'second_proxy_string', _('Proxy Configuration URL'), _('Enter connection string starting with vless:// or ss:// for proxy configuration'));
        o.depends('second_proxy_config_type', 'url');
        o.rows = 5;
        o.ucisection = 'second';

        o = s.taboption('secondary_config', form.TextValue, 'second_outbound_json', _('Outbound Configuration'), _('Enter complete outbound configuration in JSON format'));
        o.depends('second_proxy_config_type', 'outbound');
        o.rows = 10;
        o.ucisection = 'second';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            try {
                const parsed = JSON.parse(value);
                if (!parsed.type || !parsed.server || !parsed.server_port) {
                    return _('JSON must contain at least type, server and server_port fields');
                }
                return true;
            } catch (e) {
                return _('Invalid JSON format');
            }
        };

        o = s.taboption('secondary_config', form.ListValue, 'second_interface', _('Network Interface'), _('Select network interface for VPN connection'));
        o.depends('second_mode', 'vpn');
        o.ucisection = 'second';

        try {
            const devices = await network.getDevices();
            const excludeInterfaces = ['br-lan', 'eth0', 'eth1', 'wan', 'phy0-ap0', 'phy1-ap0'];

            devices.forEach(function (device) {
                if (device.dev && device.dev.name) {
                    const deviceName = device.dev.name;
                    const isExcluded = excludeInterfaces.includes(deviceName) || /^lan\d+$/.test(deviceName);

                    if (!isExcluded) {
                        o.value(deviceName, deviceName);
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching devices:', error);
        }

        o = s.taboption('secondary_config', form.Flag, 'second_domain_service_enabled', _('Service Domain List Enable'), _('Enable predefined service domain lists for routing'));
        o.default = '0';
        o.rmempty = false;
        o.depends('second_enable', '1');
        o.ucisection = 'second';

        o = s.taboption('secondary_config', form.ListValue, 'second_service_list', _('Service List'), _('Select predefined services for routing'));
        o.placeholder = 'placeholder';
        o.value('youtube', 'Youtube');
        o.depends('second_domain_service_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'second';

        o = s.taboption('secondary_config', form.ListValue, 'second_custom_domains_list_enabled', _('User Domain List Type'), _('Select how to add your custom domains'));
        o.value('disabled', _('Disabled'));
        o.value('dynamic', _('Dynamic List'));
        o.value('text', _('Text List'));
        o.default = 'disabled';
        o.rmempty = false;
        o.depends('second_enable', '1');
        o.ucisection = 'second';

        o = s.taboption('secondary_config', form.DynamicList, 'second_custom_domains', _('User Domains'), _('Enter domain names without protocols (example: sub.example.com or example.com)'));
        o.placeholder = 'Domains list';
        o.depends('second_custom_domains_list_enabled', 'dynamic');
        o.rmempty = false;
        o.ucisection = 'second';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const domainRegex = /^(?!-)[A-Za-z0-9-]+([-.][A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

            if (!domainRegex.test(value)) {
                return _('Invalid domain format. Enter domain without protocol (example: sub.example.com)');
            }
            return true;
        };

        o = s.taboption('secondary_config', form.TextValue, 'second_custom_domains_text', _('User Domains List'), _('Enter domain names separated by comma, space or newline (example: sub.example.com, example.com or one domain per line)'));
        o.placeholder = 'example.com, sub.example.com\ndomain.com test.com\nsubdomain.domain.com another.com, third.com';
        o.depends('second_custom_domains_list_enabled', 'text');
        o.rows = 10;
        o.rmempty = false;
        o.ucisection = 'second';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const domains = value.split(/[,\s\n]/)
                .map(d => d.trim())
                .filter(d => d.length > 0);

            const domainRegex = /^(?!-)[A-Za-z0-9-]+([-.][A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

            for (const domain of domains) {
                if (!domainRegex.test(domain)) {
                    return _('Invalid domain format: ' + domain + '. Enter domain without protocol');
                }
            }
            return true;
        };

        o = s.taboption('secondary_config', form.ListValue, 'second_custom_subnets_list_enabled', _('User Subnet List Type'), _('Select how to add your custom subnets'));
        o.value('disabled', _('Disabled'));
        o.value('dynamic', _('Dynamic List'));
        o.value('text', _('Text List'));
        o.default = 'disabled';
        o.rmempty = false;
        o.depends('second_enable', '1');
        o.ucisection = 'second';

        o = s.taboption('secondary_config', form.DynamicList, 'second_custom_subnets', _('User Subnets'), _('Enter subnets in CIDR notation (example: 103.21.244.0/22) or single IP addresses'));
        o.placeholder = 'IP or subnet';
        o.depends('second_custom_subnets_list_enabled', 'dynamic');
        o.rmempty = false;
        o.ucisection = 'second';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

            if (!subnetRegex.test(value)) {
                return _('Invalid format. Use format: X.X.X.X or X.X.X.X/Y');
            }

            const [ip, cidr] = value.split('/');
            const ipParts = ip.split('.');

            for (const part of ipParts) {
                const num = parseInt(part);
                if (num < 0 || num > 255) {
                    return _('IP address parts must be between 0 and 255');
                }
            }

            if (cidr !== undefined) {
                const cidrNum = parseInt(cidr);
                if (cidrNum < 0 || cidrNum > 32) {
                    return _('CIDR must be between 0 and 32');
                }
            }

            return true;
        };

        o = s.taboption('secondary_config', form.TextValue, 'second_custom_subnets_text', _('User Subnets List'), _('Enter subnets in CIDR notation or single IP addresses, separated by comma, space or newline'));
        o.placeholder = '103.21.244.0/22\n8.8.8.8\n1.1.1.1/32, 9.9.9.9 10.10.10.10';
        o.depends('second_custom_subnets_list_enabled', 'text');
        o.rows = 10;
        o.rmempty = false;
        o.ucisection = 'second';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const subnets = value.split(/[,\s\n]/)
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

            for (const subnet of subnets) {
                if (!subnetRegex.test(subnet)) {
                    return _('Invalid format: ' + subnet + '. Use format: X.X.X.X or X.X.X.X/Y');
                }

                const [ip, cidr] = subnet.split('/');
                const ipParts = ip.split('.');

                for (const part of ipParts) {
                    const num = parseInt(part);
                    if (num < 0 || num > 255) {
                        return _('IP parts must be between 0 and 255 in: ' + subnet);
                    }
                }

                if (cidr !== undefined) {
                    const cidrNum = parseInt(cidr);
                    if (cidrNum < 0 || cidrNum > 32) {
                        return _('CIDR must be between 0 and 32 in: ' + subnet);
                    }
                }
            }
            return true;
        };

        // Third Settings Tab

        o = s.tab('third_config', _('Third Config'));

        o = s.taboption('third_config', form.Flag, 'third_enable', _('Third VPN/Proxy Enable'), _('Enable third VPN/Proxy configuration'));
        o.default = '0';
        o.rmempty = false;
        o.ucisection = 'third';

        o = s.taboption('third_config', form.ListValue, 'third_mode', _('Connection Type'), _('Select between VPN and Proxy connection methods for traffic routing'));
        o.value('vpn', ('VPN'));
        o.value('proxy', ('Proxy'));
        o.depends('third_enable', '1');
        o.ucisection = 'third';

        o = s.taboption('third_config', form.ListValue, 'third_proxy_config_type', _('Configuration Type'), _('Select how to configure the proxy'));
        o.value('url', _('Connection URL'));
        o.value('outbound', _('Outbound Config'));
        o.default = 'url';
        o.depends('third_mode', 'proxy');
        o.ucisection = 'third';

        o = s.taboption('third_config', form.TextValue, 'third_proxy_string', _('Proxy Configuration URL'), _('Enter connection string starting with vless:// or ss:// for proxy configuration'));
        o.depends('third_proxy_config_type', 'url');
        o.rows = 5;
        o.ucisection = 'third';

        o = s.taboption('third_config', form.TextValue, 'third_outbound_json', _('Outbound Configuration'), _('Enter complete outbound configuration in JSON format'));
        o.depends('third_proxy_config_type', 'outbound');
        o.rows = 10;
        o.ucisection = 'third';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            try {
                const parsed = JSON.parse(value);
                if (!parsed.type || !parsed.server || !parsed.server_port) {
                    return _('JSON must contain at least type, server and server_port fields');
                }
                return true;
            } catch (e) {
                return _('Invalid JSON format');
            }
        };

        o = s.taboption('third_config', form.ListValue, 'third_interface', _('Network Interface'), _('Select network interface for VPN connection'));
        o.depends('third_mode', 'vpn');
        o.ucisection = 'third';

        try {
            const devices = await network.getDevices();
            const excludeInterfaces = ['br-lan', 'eth0', 'eth1', 'wan', 'phy0-ap0', 'phy1-ap0'];

            devices.forEach(function (device) {
                if (device.dev && device.dev.name) {
                    const deviceName = device.dev.name;
                    const isExcluded = excludeInterfaces.includes(deviceName) || /^lan\d+$/.test(deviceName);

                    if (!isExcluded) {
                        o.value(deviceName, deviceName);
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching devices:', error);
        }

        o = s.taboption('third_config', form.Flag, 'third_domain_service_enabled', _('Service Domain List Enable'), _('Enable predefined service domain lists for routing'));
        o.default = '0';
        o.rmempty = false;
        o.depends('third_enable', '1');
        o.ucisection = 'third';

        o = s.taboption('third_config', form.ListValue, 'third_service_list', _('Service List'), _('Select predefined services for routing'));
        o.placeholder = 'placeholder';
        o.value('youtube', 'Youtube');
        o.depends('third_domain_service_enabled', '1');
        o.rmempty = false;
        o.ucisection = 'third';

        o = s.taboption('third_config', form.ListValue, 'third_custom_domains_list_enabled', _('User Domain List Type'), _('Select how to add your custom domains'));
        o.value('disabled', _('Disabled'));
        o.value('dynamic', _('Dynamic List'));
        o.value('text', _('Text List'));
        o.default = 'disabled';
        o.rmempty = false;
        o.depends('third_enable', '1');
        o.ucisection = 'third';

        o = s.taboption('third_config', form.DynamicList, 'third_custom_domains', _('User Domains'), _('Enter domain names without protocols (example: sub.example.com or example.com)'));
        o.placeholder = 'Domains list';
        o.depends('third_custom_domains_list_enabled', 'dynamic');
        o.rmempty = false;
        o.ucisection = 'third';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const domainRegex = /^(?!-)[A-Za-z0-9-]+([-.][A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

            if (!domainRegex.test(value)) {
                return _('Invalid domain format. Enter domain without protocol (example: sub.example.com)');
            }
            return true;
        };

        o = s.taboption('third_config', form.TextValue, 'third_custom_domains_text', _('User Domains List'), _('Enter domain names separated by comma, space or newline (example: sub.example.com, example.com or one domain per line)'));
        o.placeholder = 'example.com, sub.example.com\ndomain.com test.com\nsubdomain.domain.com another.com, third.com';
        o.depends('third_custom_domains_list_enabled', 'text');
        o.rows = 10;
        o.rmempty = false;
        o.ucisection = 'third';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const domains = value.split(/[,\s\n]/)
                .map(d => d.trim())
                .filter(d => d.length > 0);

            const domainRegex = /^(?!-)[A-Za-z0-9-]+([-.][A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

            for (const domain of domains) {
                if (!domainRegex.test(domain)) {
                    return _('Invalid domain format: ' + domain + '. Enter domain without protocol');
                }
            }
            return true;
        };

        o = s.taboption('third_config', form.ListValue, 'third_custom_subnets_list_enabled', _('User Subnet List Type'), _('Select how to add your custom subnets'));
        o.value('disabled', _('Disabled'));
        o.value('dynamic', _('Dynamic List'));
        o.value('text', _('Text List'));
        o.default = 'disabled';
        o.rmempty = false;
        o.depends('third_enable', '1');
        o.ucisection = 'third';

        o = s.taboption('third_config', form.DynamicList, 'third_custom_subnets', _('User Subnets'), _('Enter subnets in CIDR notation (example: 103.21.244.0/22) or single IP addresses'));
        o.placeholder = 'IP or subnet';
        o.depends('third_custom_subnets_list_enabled', 'dynamic');
        o.rmempty = false;
        o.ucisection = 'third';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

            if (!subnetRegex.test(value)) {
                return _('Invalid format. Use format: X.X.X.X or X.X.X.X/Y');
            }

            const [ip, cidr] = value.split('/');
            const ipParts = ip.split('.');

            for (const part of ipParts) {
                const num = parseInt(part);
                if (num < 0 || num > 255) {
                    return _('IP address parts must be between 0 and 255');
                }
            }

            if (cidr !== undefined) {
                const cidrNum = parseInt(cidr);
                if (cidrNum < 0 || cidrNum > 32) {
                    return _('CIDR must be between 0 and 32');
                }
            }

            return true;
        };

        o = s.taboption('third_config', form.TextValue, 'third_custom_subnets_text', _('User Subnets List'), _('Enter subnets in CIDR notation or single IP addresses, separated by comma, space or newline'));
        o.placeholder = '103.21.244.0/22\n8.8.8.8\n1.1.1.1/32, 9.9.9.9 10.10.10.10';
        o.depends('third_custom_subnets_list_enabled', 'text');
        o.rows = 10;
        o.rmempty = false;
        o.ucisection = 'third';
        o.validate = function (section_id, value) {
            if (!value || value.length === 0) {
                return true;
            }

            const subnets = value.split(/[,\s\n]/)
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

            for (const subnet of subnets) {
                if (!subnetRegex.test(subnet)) {
                    return _('Invalid format: ' + subnet + '. Use format: X.X.X.X or X.X.X.X/Y');
                }

                const [ip, cidr] = subnet.split('/');
                const ipParts = ip.split('.');

                for (const part of ipParts) {
                    const num = parseInt(part);
                    if (num < 0 || num > 255) {
                        return _('IP parts must be between 0 and 255 in: ' + subnet);
                    }
                }

                if (cidr !== undefined) {
                    const cidrNum = parseInt(cidr);
                    if (cidrNum < 0 || cidrNum > 32) {
                        return _('CIDR must be between 0 and 32 in: ' + subnet);
                    }
                }
            }
            return true;
        };

        o = s.tab('diagnostics', _('Diagnostics'));

        // Installed versions block at the top of Diagnostics.
        o = s.taboption('diagnostics', form.DummyValue, '_version_info');
        o.rawhtml = true;
        o.cfgvalue = function () {
            const rows = [];
            // Escape values before inserting into rawhtml (defense in depth:
            // values come from root-local router data, but never inject raw).
            const esc = function (s) {
                return String(s == null ? '' : s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            };
            const addRow = function (label, value) {
                rows.push(
                    '<tr>' +
                    '<td style="padding:2px 12px 2px 0;color:#666;white-space:nowrap;">' + esc(label) + '</td>' +
                    '<td style="padding:2px 0;font-family:monospace;font-weight:600;">' +
                    esc(value || _('unknown')) + '</td>' +
                    '</tr>'
                );
            };

            if (versionInfo) {
                addRow(_('Podkop'), versionInfo.podkop_version);
                addRow(_('Sing-box'), versionInfo.sing_box_version);
                addRow(_('LuCI app'), versionInfo.luci_app_version);
                addRow(_('OpenWrt'), versionInfo.openwrt_version);
                if (versionInfo.device_model && versionInfo.device_model !== 'unknown') {
                    addRow(_('Device'), versionInfo.device_model);
                }
            } else {
                rows.push('<tr><td style="color:#999;">' + _('Version info unavailable') + '</td></tr>');
            }

            return '<table style="border-collapse:collapse;margin:0.5em 0;">' + rows.join('') + '</table>';
        };

        function formatDiagnosticOutput(output) {
            if (!output) return '';

            return output
                .replace(/\x1B\[[0-9;]*[mK]/g, '')
                .replace(/\[[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\] /g, '')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/===\s+(.*?)\s+===/g, (_, title) => `\n${title}\n${'─'.repeat(title.length)}`)
                .replace(/^Checking\s+(.+)\.{3}/gm, '► Checking $1...')
                .replace(/:\s+(available|not found)$/gm, (_, status) =>
                    `: ${status === 'available' ? '✓' : '✗'}`);
        }

        // Check All - полная диагностика
        o = s.taboption('diagnostics', form.Button, '_check_all');
        o.title = _('Main Check');
        o.description = _('Run a comprehensive diagnostic check of all components');
        o.inputtitle = _('Run Check');
        o.inputstyle = 'apply';
        o.onclick = function () {
            return fs.exec('/etc/init.d/podkop', ['check_three'])
                .then(function (res) {
                    const formattedOutput = formatDiagnosticOutput(res.stdout || _('No output'));

                    const modalElement = ui.showModal(_('Full Diagnostic Results'), [
                        E('div', {
                            style:
                                'max-height: 70vh;' +
                                'overflow-y: auto;' +
                                'margin: 1em 0;' +
                                'padding: 1.5em;' +
                                'background: #f8f9fa;' +
                                'border: 1px solid #e9ecef;' +
                                'border-radius: 4px;' +
                                'font-family: monospace;' +
                                'white-space: pre-wrap;' +
                                'word-wrap: break-word;' +
                                'line-height: 1.5;' +
                                'font-size: 14px;'
                        }, [
                            E('pre', { style: 'margin: 0;' }, formattedOutput)
                        ]),
                        E('div', {
                            style: 'display: flex; justify-content: space-between; margin-top: 1em;'
                        }, [
                            E('button', {
                                'class': 'btn',
                                'click': function () {
                                    const textarea = document.createElement('textarea');
                                    textarea.value = '```txt\n' + formattedOutput + '\n```';
                                    document.body.appendChild(textarea);
                                    textarea.select();
                                    try {
                                        document.execCommand('copy');
                                    } catch (err) {
                                        ui.addNotification(null, E('p', {}, _('Failed to copy: ') + err.message));
                                    }
                                    document.body.removeChild(textarea);
                                }
                            }, _('Copy to Clipboard')),
                            E('button', {
                                'class': 'btn',
                                'click': ui.hideModal
                            }, _('Close'))
                        ])
                    ], 'large');

                    if (modalElement && modalElement.parentElement) {
                        modalElement.parentElement.style.width = '90%';
                        modalElement.parentElement.style.maxWidth = '1200px';
                        modalElement.parentElement.style.margin = '2rem auto';
                    }
                });
        };

        o = s.taboption('diagnostics', form.Button, '_check_logs');
        o.title = _('System Logs');
        o.description = _('View recent system logs related to Podkop');
        o.inputtitle = _('View Logs');
        o.inputstyle = 'apply';
        o.onclick = function () {
            return fs.exec('/etc/init.d/podkop', ['check_logs'])
                .then(function (res) {
                    const formattedOutput = formatDiagnosticOutput(res.stdout || _('No output'));

                    const modalElement = ui.showModal(_('System Logs'), [
                        E('div', {
                            style:
                                'max-height: 70vh;' +
                                'overflow-y: auto;' +
                                'margin: 1em 0;' +
                                'padding: 1.5em;' +
                                'background: #f8f9fa;' +
                                'border: 1px solid #e9ecef;' +
                                'border-radius: 4px;' +
                                'font-family: monospace;' +
                                'white-space: pre-wrap;' +
                                'word-wrap: break-word;' +
                                'line-height: 1.5;' +
                                'font-size: 14px;'
                        }, [
                            E('pre', { style: 'margin: 0;' }, formattedOutput)
                        ]),
                        E('div', {
                            style: 'display: flex; justify-content: space-between; margin-top: 1em;'
                        }, [
                            E('button', {
                                'class': 'btn',
                                'click': function () {
                                    const textarea = document.createElement('textarea');
                                    textarea.value = '```txt\n' + formattedOutput + '\n```';
                                    document.body.appendChild(textarea);
                                    textarea.select();
                                    try {
                                        document.execCommand('copy');
                                    } catch (err) {
                                        ui.addNotification(null, E('p', {}, _('Failed to copy: ') + err.message));
                                    }
                                    document.body.removeChild(textarea);
                                }
                            }, _('Copy to Clipboard')),
                            E('button', {
                                'class': 'btn',
                                'click': ui.hideModal
                            }, _('Close'))
                        ])
                    ], 'large');

                    if (modalElement && modalElement.parentElement) {
                        modalElement.parentElement.style.width = '90%';
                        modalElement.parentElement.style.maxWidth = '1200px';
                        modalElement.parentElement.style.margin = '2rem auto';
                    }
                });
        };

        o = s.taboption('diagnostics', form.Button, '_list_update');
        o.title = _('Update lists');
        o.description = _('Update all lists in config');
        o.inputtitle = _('Update lists');
        o.inputstyle = 'apply';
        o.onclick = function () {
            fs.exec('/etc/init.d/podkop', ['list_update']);

            ui.showModal(_('List Update'), [
                E('p', {}, _('Lists will be updated in background. You can check the progress in system logs.')),
                E('div', { class: 'right' }, [
                    E('button', {
                        'class': 'btn',
                        'click': ui.hideModal
                    }, _('Close'))
                ])
            ]);
        };

        // View Debug Log
        o = s.taboption('diagnostics', form.Button, '_show_debug_log');
        o.title = _('Debug Log');
        o.description = _('View the full debug log (only populated when Log Level = Debug)');
        o.inputtitle = _('View Debug Log');
        o.inputstyle = 'apply';
        o.onclick = function () {
            return fs.exec('/etc/init.d/podkop', ['show_debug_log'])
                .then(function (res) {
                    // Show the debug log raw (only strip ANSI escapes) so the
                    // per-line timestamps — the whole point of the log — survive.
                    const formattedOutput = (res.stdout || _('No output')).replace(/\x1B\[[0-9;]*[mK]/g, '');

                    const modalElement = ui.showModal(_('Debug Log'), [
                        E('div', {
                            style:
                                'max-height: 70vh;' +
                                'overflow-y: auto;' +
                                'margin: 1em 0;' +
                                'padding: 1.5em;' +
                                'background: #f8f9fa;' +
                                'border: 1px solid #e9ecef;' +
                                'border-radius: 4px;' +
                                'font-family: monospace;' +
                                'white-space: pre-wrap;' +
                                'word-wrap: break-word;' +
                                'line-height: 1.5;' +
                                'font-size: 14px;'
                        }, [
                            E('pre', { style: 'margin: 0;' }, formattedOutput)
                        ]),
                        E('div', { class: 'right' }, [
                            E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Close'))
                        ])
                    ], 'large');

                    if (modalElement && modalElement.parentElement) {
                        modalElement.parentElement.style.width = '90%';
                        modalElement.parentElement.style.maxWidth = '1200px';
                        modalElement.parentElement.style.margin = '2rem auto';
                    }
                });
        };

        // Backup configuration -> download as a file in the browser
        o = s.taboption('diagnostics', form.Button, '_backup');
        o.title = _('Backup configuration');
        o.description = _('Download the current podkop configuration as a file');
        o.inputtitle = _('Backup');
        o.inputstyle = 'apply';
        o.onclick = function () {
            return fs.exec('/etc/init.d/podkop', ['backup'])
                .then(function (res) {
                    if (res.code !== 0 || !res.stdout) {
                        ui.addNotification(null, E('p', {}, _('Backup failed: ') + (res.stderr || _('no output'))));
                        return;
                    }
                    const blob = new Blob([res.stdout], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'podkop-backup-' + ts + '.conf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    ui.addNotification(null, E('p', {}, _('Backup downloaded.')), 'info');
                });
        };

        // Restore configuration <- upload a file and apply it on the router
        o = s.taboption('diagnostics', form.Button, '_restore');
        o.title = _('Restore configuration');
        o.description = _('Upload a podkop backup file and apply it (the current config is saved first)');
        o.inputtitle = _('Restore');
        o.inputstyle = 'apply';
        o.onclick = function () {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.conf,text/plain';
            input.style.display = 'none';
            document.body.appendChild(input);
            input.onchange = function () {
                const file = input.files && input.files[0];
                document.body.removeChild(input);
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function () {
                    const content = reader.result;
                    if (!content || content.indexOf('config main') === -1) {
                        ui.addNotification(null, E('p', {}, _('This file does not look like a podkop config. Aborted.')));
                        return;
                    }
                    const tmpPath = '/tmp/podkop-restore.conf';
                    ui.showModal(_('Restoring configuration'), [
                        E('p', { class: 'spinning' }, _('Applying configuration and reloading podkop...'))
                    ]);
                    fs.write(tmpPath, content)
                        .then(function () {
                            return fs.exec('/etc/init.d/podkop', ['restore', tmpPath]);
                        })
                        .then(function (res) {
                            ui.hideModal();
                            const out = (res.stdout || '') + (res.stderr || '');
                            if (res.code === 0) {
                                ui.addNotification(null, E('p', {}, _('Configuration restored. Reloading page...')), 'info');
                                window.setTimeout(function () { location.reload(); }, 2000);
                            } else {
                                ui.addNotification(null, E('p', {}, _('Restore failed: ') + out));
                            }
                        })
                        .catch(function (e) {
                            ui.hideModal();
                            ui.addNotification(null, E('p', {}, _('Restore error: ') + e.message));
                        });
                };
                reader.readAsText(file);
            };
            input.click();
        };

        return m.render();
    }
});