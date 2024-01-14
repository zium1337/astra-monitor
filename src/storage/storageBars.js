/*
 * Copyright (C) 2023 Lju
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

import GObject from 'gi://GObject';

import { BarsBase } from '../bars.js';

export const StorageBars = GObject.registerClass({
    
}, class StorageBarsBase extends BarsBase {
    constructor(params) {
        //TODO: Make these configurable
        if(params.colors === undefined)
            params.colors = ['rgb(29,172,214)'];
        
        super(params);
    }
    
    setUsage(usage) {
        if(!usage || !usage.hasOwnProperty('usePercentage')) {
            this.updateBars([]);
            return;
        }
        
        this.updateBars([
            [{ color: 0, value: usage.usePercentage / 100.0 }],
        ]);
    }
});