/*!
 * Copyright (C) 2023 Lju
 *
 * This file is part of Astra Monitor extension for GNOME Shell.
 * [https://github.com/AstraExt/astra-monitor]
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import {
    ExtensionPreferences,
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import Utils from './src/utils/utils.js';
import Config from './src/config.js';

import PrefsUtils from './src/prefs/prefsUtils.js';
import Welcome from './src/prefs/welcome.js';
import Profiles from './src/prefs/profiles.js';
import Visualization from './src/prefs/visualization.js';
import Processors from './src/prefs/processors.js';
import Gpu from './src/prefs/gpu.js';
import Memory from './src/prefs/memory.js';
import Storage from './src/prefs/storage.js';
import Network from './src/prefs/network.js';
import Sensors from './src/prefs/sensors.js';
import Utility from './src/prefs/utility.js';
import About from './src/prefs/about.js';

import Signal from './src/signal.js';

export default class AstraMonitorPrefs extends ExtensionPreferences {
    private minimumSize = { width: 600, height: 300 };
    private defaultSize = { width: 850, height: 700 };

    private active: Adw.ActionRow | null = null;

    private welcome!: Welcome;
    private profiles!: Profiles;
    private visualization!: Visualization;
    private processors!: Processors;
    private gpu!: Gpu;
    private memory!: Memory;
    private storage!: Storage;
    private network!: Network;
    private sensors!: Sensors;
    private utility!: Utility;
    private about!: About;

    private loadCustomTheme() {
        try {
            const display = Gdk.Display.get_default();
            if(!display) throw new Error('Display not found');
            const iconTheme = Gtk.IconTheme.get_for_display(display);
            if(!Utils.metadata) throw new Error('Metadata not found');
            const iconsPath = (Utils.metadata as any).dir.get_child('icons').get_path();
            if(!iconsPath) throw new Error('Icons path not found');
            iconTheme.add_search_path(iconsPath);
        } catch(e: any) {
            Utils.error('Error loading custom theme', e);
        }
    }

    async fillPreferencesWindow(window: Adw.PreferencesWindow) {
        try {
            Utils.init({
                service: 'prefs',
                metadata: this.metadata,
                settings: this.getSettings(),
            });
            PrefsUtils.expanded = new Map();

            Signal.connect(window, 'close-request', () => {
                Utils.clear();

                this.active = null;
                this.welcome = undefined as any;
                this.profiles = undefined as any;
                this.visualization = undefined as any;
                this.processors = undefined as any;
                this.gpu = undefined as any;
                this.memory = undefined as any;
                this.storage = undefined as any;
                this.network = undefined as any;
                this.sensors = undefined as any;
                this.utility = undefined as any;
                this.about = undefined as any;
                PrefsUtils.expanded = undefined as any;
            });

            this.loadCustomTheme();

            //! Add dummy page to avoid exception
            window.add(new Adw.PreferencesPage());

            const navigation = new Adw.NavigationSplitView({
                vexpand: true,
                hexpand: true,
            });
            window.set_content(navigation);

            this.welcome = new Welcome(this);
            this.profiles = new Profiles(this);
            this.visualization = new Visualization(this);
            this.processors = new Processors(this);
            this.gpu = new Gpu(this);
            this.memory = new Memory(this);
            this.storage = new Storage(this);
            this.network = new Network(this);
            this.sensors = new Sensors(this);
            this.utility = new Utility(this, window);
            this.about = new About(this);

            const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
            const colorScheme = settings.get_string('color-scheme');

            if(
                colorScheme === 'prefer-dark' ||
                (Gtk.Settings.get_default()?.gtkApplicationPreferDarkTheme ?? false) ||
                Adw.StyleManager.get_default().dark
            ) {
                AstraMonitorPrefs.addCss(`
                    .am-active {
                        background-color: rgba(255, 255, 255, 0.1);
                    }
                `);
            } else {
                AstraMonitorPrefs.addCss(`
                    .am-active {
                        background-color: rgba(0, 0, 0, 0.1);
                    }
                `);
            }
            this.setupSidebar(navigation);

            Config.connect(this, 'changed', (_settings: Gio.Settings, key: string) => {
                try {
                    if(Config.globalSettingsKeys.includes(key)) {
                        return;
                    }
                    Config.updatedProfilesConfig(key);
                } catch(e: any) {
                    Utils.error('Error updating profile config', e);
                }
            });
        } catch(e: any) {
            Utils.error('Error filling preferences window', e);
        }

        window.set_default_size(this.defaultSize.width, this.defaultSize.height);
        window.set_size_request(this.minimumSize.width, this.minimumSize.height);
    }

    private setupSidebar(navigation: Adw.NavigationSplitView) {
        const sidebar = new Adw.NavigationPage({
            title: 'Astra Monitor',
        });

        const toolbar = new Adw.ToolbarView();
        const header = new Adw.HeaderBar();
        toolbar.add_top_bar(header);
        sidebar.set_child(toolbar);

        const menu = new Adw.PreferencesPage({
            vexpand: true,
            hexpand: true,
            marginTop: 0,
            marginBottom: 0,
            marginStart: 0,
            marginEnd: 0,
        });

        const welcomeGroup = new Adw.PreferencesGroup({
            hexpand: true,
            marginTop: 0,
            marginBottom: 0,
            marginStart: 10,
            marginEnd: 10,
        });
        menu.add(welcomeGroup);

        const welcomeBtn = PrefsUtils.addButtonRow(
            {
                title: _('Welcome'),
                iconName: 'am-home-symbolic',
            },
            welcomeGroup,
            btn => {
                if(navigation.content !== this.welcome.page)
                    navigation.set_content(this.welcome.page);
                this.activateItem(btn);
            }
        );

        const generalGroup = new Adw.PreferencesGroup({
            hexpand: true,
            marginTop: 0,
            marginBottom: 0,
            marginStart: 10,
            marginEnd: 10,
        });
        menu.add(generalGroup);

        const profilesBtn = PrefsUtils.addButtonRow(
            {
                title: _('Profiles'),
                iconName: 'am-profile-symbolic',
            },
            generalGroup,
            btn => {
                if(navigation.content !== this.profiles.page)
                    navigation.set_content(this.profiles.page);
                this.activateItem(btn);
            }
        );

        {
            const currentProfile = Config.get_string('current-profile') ?? 'default';
            profilesBtn.subtitle = '  ' + currentProfile;
        }
        Config.connect(this, 'changed::current-profile', () => {
            const currentProfile = Config.get_string('current-profile') ?? 'default';
            profilesBtn.subtitle = '  ' + currentProfile;
        });

        PrefsUtils.addButtonRow(
            {
                title: _('Visualization'),
                iconName: 'am-ui-symbolic',
            },
            generalGroup,
            btn => {
                if(navigation.content !== this.visualization.page)
                    navigation.set_content(this.visualization.page);
                this.activateItem(btn);
            }
        );

        const monitorsGroup = new Adw.PreferencesGroup({
            hexpand: true,
            marginTop: 0,
            marginBottom: 0,
            marginStart: 10,
            marginEnd: 10,
        });
        menu.add(monitorsGroup);

        // Processors
        let processorsDefaultBtn: Adw.ActionRow | null = null;

        const processors = PrefsUtils.addExpanderRow(
            {
                title: _('Processors'),
                iconName: 'am-cpu-symbolic',
            },
            monitorsGroup,
            'menu',
            expanded => {
                if(expanded && processorsDefaultBtn) {
                    processorsDefaultBtn.activate();
                    processorsDefaultBtn.grab_focus();
                }
            }
        );
        processorsDefaultBtn = PrefsUtils.addButtonRow(
            {
                title: _('General'),
                tabs: 1,
            },
            processors,
            () => {
                if(navigation.content !== this.processors.generalPage)
                    navigation.set_content(this.processors.generalPage);
                this.activateItem(processorsDefaultBtn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Header'),
                tabs: 1,
            },
            processors,
            btn => {
                if(navigation.content !== this.processors.headerPage)
                    navigation.set_content(this.processors.headerPage);
                this.activateItem(btn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Menu'),
                tabs: 1,
            },
            processors,
            btn => {
                if(navigation.content !== this.processors.menuPage)
                    navigation.set_content(this.processors.menuPage);
                this.activateItem(btn);
            }
        );

        // GPU
        let gpuDefaultBtn: Adw.ActionRow | null = null;

        const gpu = PrefsUtils.addExpanderRow(
            {
                title: _('GPU'),
                iconName: 'am-gpu-symbolic',
            },
            monitorsGroup,
            'menu',
            expanded => {
                if(expanded && gpuDefaultBtn) {
                    gpuDefaultBtn.activate();
                    gpuDefaultBtn.grab_focus();
                }
            }
        );
        gpuDefaultBtn = PrefsUtils.addButtonRow(
            {
                title: _('General'),
                tabs: 1,
            },
            gpu,
            btn => {
                if(navigation.content !== this.gpu.generalPage)
                    navigation.set_content(this.gpu.generalPage);
                this.activateItem(btn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Header'),
                tabs: 1,
            },
            gpu,
            btn => {
                if(navigation.content !== this.gpu.headerPage)
                    navigation.set_content(this.gpu.headerPage);
                this.activateItem(btn);
            }
        );
        /*PrefsUtils.addButtonRow(
            {
                title: _('Menu'),
                tabs: 1,
            },
            gpu,
            (btn) => {
                if(navigation.content !== this.gpu.menuPage)
                    navigation.set_content(this.gpu.menuPage);
                this.activateItem(btn);
            }
        );*/

        // Memory
        let memoryDefaultBtn: Adw.ActionRow | null = null;

        const memory = PrefsUtils.addExpanderRow(
            {
                title: _('Memory'),
                iconName: 'am-memory-symbolic',
            },
            monitorsGroup,
            'menu',
            expanded => {
                if(expanded && memoryDefaultBtn) {
                    memoryDefaultBtn.activate();
                    memoryDefaultBtn.grab_focus();
                }
            }
        );
        memoryDefaultBtn = PrefsUtils.addButtonRow(
            {
                title: _('General'),
                tabs: 1,
            },
            memory,
            btn => {
                if(navigation.content !== this.memory.generalPage)
                    navigation.set_content(this.memory.generalPage);
                this.activateItem(btn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Header'),
                tabs: 1,
            },
            memory,
            btn => {
                if(navigation.content !== this.memory.headerPage)
                    navigation.set_content(this.memory.headerPage);
                this.activateItem(btn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Menu'),
                tabs: 1,
            },
            memory,
            btn => {
                if(navigation.content !== this.memory.menuPage)
                    navigation.set_content(this.memory.menuPage);
                this.activateItem(btn);
            }
        );

        // Storage
        let storageDefaultBtn: Adw.ActionRow | null = null;

        const storage = PrefsUtils.addExpanderRow(
            {
                title: _('Storage'),
                iconName: 'am-harddisk-symbolic',
            },
            monitorsGroup,
            'menu',
            expanded => {
                if(expanded && storageDefaultBtn) {
                    storageDefaultBtn.activate();
                    storageDefaultBtn.grab_focus();
                }
            }
        );
        storageDefaultBtn = PrefsUtils.addButtonRow(
            {
                title: _('General'),
                tabs: 1,
            },
            storage,
            btn => {
                if(navigation.content !== this.storage.generalPage)
                    navigation.set_content(this.storage.generalPage);
                this.activateItem(btn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Header'),
                tabs: 1,
            },
            storage,
            btn => {
                if(navigation.content !== this.storage.headerPage)
                    navigation.set_content(this.storage.headerPage);
                this.activateItem(btn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Menu'),
                tabs: 1,
            },
            storage,
            btn => {
                if(navigation.content !== this.storage.menuPage)
                    navigation.set_content(this.storage.menuPage);
                this.activateItem(btn);
            }
        );

        // Network
        let networkDefaultBtn: Adw.ActionRow | null = null;

        const network = PrefsUtils.addExpanderRow(
            {
                title: _('Network'),
                iconName: 'am-network-symbolic',
            },
            monitorsGroup,
            'menu',
            expanded => {
                if(expanded && networkDefaultBtn) {
                    networkDefaultBtn.activate();
                    networkDefaultBtn.grab_focus();
                }
            }
        );
        networkDefaultBtn = PrefsUtils.addButtonRow(
            {
                title: _('General'),
                tabs: 1,
            },
            network,
            btn => {
                if(navigation.content !== this.network.generalPage)
                    navigation.set_content(this.network.generalPage);
                this.activateItem(btn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Header'),
                tabs: 1,
            },
            network,
            btn => {
                if(navigation.content !== this.network.headerPage)
                    navigation.set_content(this.network.headerPage);
                this.activateItem(btn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Menu'),
                tabs: 1,
            },
            network,
            btn => {
                if(navigation.content !== this.network.menuPage)
                    navigation.set_content(this.network.menuPage);
                this.activateItem(btn);
            }
        );

        // Sensors
        let sensorsDefaultBtn: Adw.ActionRow | null = null;

        const sensors = PrefsUtils.addExpanderRow(
            {
                title: _('Sensors'),
                iconName: 'am-temperature-symbolic',
            },
            monitorsGroup,
            'menu',
            expanded => {
                if(expanded && sensorsDefaultBtn) {
                    sensorsDefaultBtn.activate();
                    sensorsDefaultBtn.grab_focus();
                }
            }
        );
        sensorsDefaultBtn = PrefsUtils.addButtonRow(
            {
                title: _('General'),
                tabs: 1,
            },
            sensors,
            btn => {
                if(navigation.content !== this.sensors.generalPage)
                    navigation.set_content(this.sensors.generalPage);
                this.activateItem(btn);
            }
        );
        PrefsUtils.addButtonRow(
            {
                title: _('Header'),
                tabs: 1,
            },
            sensors,
            btn => {
                if(navigation.content !== this.sensors.headerPage)
                    navigation.set_content(this.sensors.headerPage);
                this.activateItem(btn);
            }
        );
        /*PrefsUtils.addButtonRow(
            {
                title: _('Menu'),
                tabs: 1,
            },
            sensors,
            (btn) => {
                if(navigation.content !== this.sensors.menuPage)
                    navigation.set_content(this.sensors.menuPage);
                this.activateItem(btn);
            }
        );*/

        const aboutGroup = new Adw.PreferencesGroup({
            hexpand: true,
            marginTop: 0,
            marginBottom: 0,
            marginStart: 10,
            marginEnd: 10,
        });
        menu.add(aboutGroup);

        // Utility
        PrefsUtils.addButtonRow(
            {
                title: _('Utility'),
                iconName: 'am-tools-symbolic',
            },
            aboutGroup,
            btn => {
                if(navigation.content !== this.utility.page)
                    navigation.set_content(this.utility.page);
                this.activateItem(btn);
            }
        );

        // About
        PrefsUtils.addButtonRow(
            {
                title: _('About'),
                iconName: 'am-dialog-info-symbolic',
            },
            aboutGroup,
            btn => {
                if(navigation.content !== this.about.page) navigation.set_content(this.about.page);
                this.activateItem(btn);
            }
        );

        toolbar.set_content(menu);

        const defaultCategory = Config.get_string('queued-pref-category');
        Config.set('queued-pref-category', '', 'string');
        if(defaultCategory) {
            if(defaultCategory === 'processors') {
                if(processors) {
                    processors.activate();
                }
            } else if(defaultCategory === 'gpu') {
                if(gpu) {
                    gpu.activate();
                }
            } else if(defaultCategory === 'memory') {
                if(memory) {
                    memory.activate();
                }
            } else if(defaultCategory === 'storage') {
                if(storage) {
                    storage.activate();
                }
            } else if(defaultCategory === 'network') {
                if(network) {
                    network.activate();
                }
            } else if(defaultCategory === 'sensors') {
                if(sensors) {
                    sensors.activate();
                }
            } else if(defaultCategory === 'profiles') {
                if(profilesBtn) {
                    profilesBtn.activate();
                }
            } else {
                if(welcomeBtn) {
                    welcomeBtn.activate();
                }
            }
        } else {
            if(welcomeBtn) {
                welcomeBtn.activate();
            }
        }
        navigation.set_sidebar(sidebar);
        return sidebar;
    }

    public activateItem(item: Adw.ActionRow | null) {
        if(!item) return;

        if(this.active && this.active.title) {
            this.active.remove_css_class('am-active');
        }

        item.add_css_class('am-active');
        this.active = item;
    }

    // @ts-expect-error never used
    private static applyCssToWidget(widget: Gtk.Widget, cssString: string) {
        const cssProvider = new Gtk.CssProvider();
        cssProvider.load_from_data(cssString, cssString.length);
        widget
            .get_style_context()
            .add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
    }

    private static addCss(cssData: string) {
        const display = Gdk.Display.get_default();
        if(display) {
            const cssProvider = new Gtk.CssProvider();
            cssProvider.load_from_data(cssData, cssData.length);

            Gtk.StyleContext.add_provider_for_display(
                display,
                cssProvider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            );
        }
    }
}
