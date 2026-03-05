import { Component, OnInit, Input, Output, EventEmitter, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AssetLayerService, AssetLayerConfig } from '../../../services/asset-layer.service';

/**
 * Asset Layer Toggle Component
 * Allows users to show/hide asset layers on the map by category
 */
@Component({
  selector: 'app-asset-layer-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asset-layer-toggle.component.html',
  styleUrl: './asset-layer-toggle.component.scss',
})
export class AssetLayerToggleComponent implements OnInit, OnDestroy {
  private assetLayerService = inject(AssetLayerService);
  private destroy$ = new Subject<void>();

  @Input() collapsed = false;
  @Output() layerToggled = new EventEmitter<{ layerId: string; category: string; visible: boolean }>();
  @Output() collapsed$ = new EventEmitter<boolean>();

  layerConfigs: AssetLayerConfig[] = [];

  ngOnInit(): void {
    this.assetLayerService
      .getLayerConfigs()
      .pipe(takeUntil(this.destroy$))
      .subscribe((configs) => {
        this.layerConfigs = configs;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleLayer(layerId: string): void {
    const config = this.layerConfigs.find((c) => c.id === layerId);
    if (!config) {
      return;
    }

    const visible = this.assetLayerService.toggleLayerVisibility(layerId);

    this.layerConfigs = this.layerConfigs.map((layer) =>
      layer.id === layerId ? { ...layer, visible } : layer,
    );

    this.layerToggled.emit({ layerId, category: config.category, visible });
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.collapsed$.emit(this.collapsed);
  }

  getLayerColorStyle(color: string): { borderLeft: string; backgroundColor: string } {
    return {
      borderLeft: `4px solid ${color}`,
      backgroundColor: `${color}20`,
    };
  }

  getColorSwatch(color: string): { backgroundColor: string; borderColor: string } {
    return {
      backgroundColor: color,
      borderColor: color,
    };
  }
}
