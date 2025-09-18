import { TrendDown01, TrendUp01 } from '@untitledui/icons';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'orange' | 'red';
}

export function MetricCard({ title, value, subtitle, trend, icon: Icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400',
    green: 'bg-success-50 text-success-600 dark:bg-success-950 dark:text-success-400',
    orange: 'bg-warning-50 text-warning-600 dark:bg-warning-950 dark:text-warning-400',
    red: 'bg-error-50 text-error-600 dark:bg-error-950 dark:text-error-400'
  };

  return (
    <div className="bg-surface-1 border border-surface rounded-lg shadow-sm p-6 hover:bg-surface-2 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {typeof trend === 'number' && (
            <div className="flex items-center mt-2">
              {trend >= 0 ? (
                <TrendUp01 className="h-4 w-4 text-success-600 mr-1" />
              ) : (
                <TrendDown01 className="h-4 w-4 text-error-600 mr-1" />
              )}
              <span className={`text-sm font-medium ${trend >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]} transition-colors`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}