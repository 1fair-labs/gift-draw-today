import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Mock price data - replace with real API data
const generateMockData = () => {
  const data = [];
  let price = 0.85;
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Random walk
    price = price + (Math.random() - 0.48) * 0.05;
    price = Math.max(0.5, Math.min(1.5, price));
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Number(price.toFixed(4)),
    });
  }
  return data;
};

const data = generateMockData();
const currentPrice = data[data.length - 1].price;
const previousPrice = data[data.length - 2].price;
const priceChange = ((currentPrice - previousPrice) / previousPrice * 100).toFixed(2);
const isPositive = Number(priceChange) >= 0;

export const PriceChart = () => {
  return (
    <div className="glass-card p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
            CLT/USDT Price
          </h2>
          <p className="text-muted-foreground">
            CryptoLottery Token exchange rate
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl md:text-4xl font-display font-bold text-foreground">
              ${currentPrice}
            </div>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-neon-green' : 'text-red-500'}`}>
              <span>{isPositive ? '↑' : '↓'}</span>
              <span>{isPositive ? '+' : ''}{priceChange}%</span>
              <span className="text-muted-foreground text-sm">24h</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-64 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--neon-purple))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--neon-purple))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              width={60}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value: number) => [`$${value.toFixed(4)}`, 'Price']}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="hsl(var(--neon-purple))"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="glass-card p-3">
          <div className="text-muted-foreground text-sm">24h Low</div>
          <div className="text-foreground font-bold">$0.82</div>
        </div>
        <div className="glass-card p-3">
          <div className="text-muted-foreground text-sm">24h High</div>
          <div className="text-foreground font-bold">$0.94</div>
        </div>
        <div className="glass-card p-3">
          <div className="text-muted-foreground text-sm">24h Volume</div>
          <div className="text-foreground font-bold">$1.2M</div>
        </div>
      </div>
    </div>
  );
};
