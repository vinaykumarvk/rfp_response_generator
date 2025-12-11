import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  TrendingUp,
  RefreshCw,
  Filter,
  Calculator,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Analytics() {
  const [selectedRfpName, setSelectedRfpName] = useState<string>('all');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { toast } = useToast();

  // Fetch analytics data with optional RFP filter
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics', selectedRfpName],
    queryFn: async () => {
      const url = selectedRfpName && selectedRfpName !== 'all' 
        ? `/api/analytics?rfpName=${encodeURIComponent(selectedRfpName)}`
        : '/api/analytics';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Analytics & Fitment Score</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Track your RFP response fitment metrics</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Analytics & Fitment Score</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Track your RFP response fitment metrics</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400 mb-4">Failed to load analytics data</p>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    totalQuestions = 0,
    responsesGenerated = 0,
    fullySupported = 0,
    partiallySupported = 0,
    notSupported = 0,
    fitmentPercentage = 0,
    ekgResponsesGenerated = 0,
    uniqueRfpNames = [],
  } = data || {};

  const getFitmentColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getFitmentBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900';
    if (percentage >= 60) return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900';
    return 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900';
  };

  // Handle recalculating fitment scores
  const handleRecalculateFitmentScores = async () => {
    setIsRecalculating(true);
    try {
      const response = await fetch('/api/analytics/recalculate-fitment-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to recalculate fitment scores');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Fitment Scores Recalculated',
          description: result.message || `Successfully recalculated ${result.processed} fitment scores. Scores have been updated in the database.`,
        });
        
        // Refetch analytics data to show updated scores
        await refetch();
        
        // Trigger a global refresh event so other components can refresh their data
        window.dispatchEvent(new CustomEvent('fitmentScoresRecalculated'));
      } else {
        throw new Error(result.message || 'Recalculation failed');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to recalculate fitment scores',
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Analytics & Fitment Score</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Track your RFP response fitment metrics and overall coverage
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* RFP Filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="rfp-filter" className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              RFP:
            </Label>
            <Select value={selectedRfpName} onValueChange={setSelectedRfpName}>
              <SelectTrigger id="rfp-filter" className="w-[200px]">
                <SelectValue placeholder="All RFPs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All RFPs</SelectItem>
                {uniqueRfpNames.map((name: string) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Show active filter badge */}
      {selectedRfpName && selectedRfpName !== 'all' && (
        <Card className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Filtered by RFP: <strong>{selectedRfpName}</strong>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRfpName('all')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fitment Score Card - Prominent */}
      <Card className={`${getFitmentBgColor(fitmentPercentage)} border-2`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-slate-700 dark:text-slate-300" />
              <CardTitle className="text-2xl">Fitment Score</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <div className={`text-4xl font-bold ${getFitmentColor(fitmentPercentage)}`}>
                {fitmentPercentage.toFixed(1)}%
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculateFitmentScores}
                disabled={isRecalculating}
                className="flex items-center gap-2"
                title="Recalculate fitment scores for all EKG responses"
              >
                {isRecalculating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Calculating...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    <span className="hidden sm:inline">Recalculate</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          <CardDescription className="text-base mt-2">
            Based on {ekgResponsesGenerated || responsesGenerated} EKG response{(ekgResponsesGenerated || responsesGenerated) !== 1 ? 's' : ''} generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Fully Supported</span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                {fullySupported} × 1.0 = {fullySupported.toFixed(1)} points
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Partially Supported</span>
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {partiallySupported} × 0.5 = {(partiallySupported * 0.5).toFixed(1)} points
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Not Supported</span>
              <span className="font-semibold text-red-700 dark:text-red-300">
                {notSupported} × 0.0 = 0.0 points
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Total Score</span>
                <span className="font-bold text-lg">
                  {((fullySupported * 1) + (partiallySupported * 0.5)).toFixed(1)} / {ekgResponsesGenerated || responsesGenerated}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Formula: (Fully × 1.0 + Partially × 0.5 + Not × 0.0) ÷ Total EKG Responses
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Questions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <p className="text-xs text-slate-500 mt-1">All requirements in the system</p>
          </CardContent>
        </Card>

        {/* Responses Generated */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses Generated</CardTitle>
            <MessageSquare className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responsesGenerated}</div>
            <p className="text-xs text-slate-500 mt-1">
              {totalQuestions > 0 
                ? `${Math.round((responsesGenerated / totalQuestions) * 100)}% completion rate`
                : 'No questions yet'}
            </p>
          </CardContent>
        </Card>

        {/* Fully Supported */}
        <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Fully Supported
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{fullySupported}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {responsesGenerated > 0 
                ? `${Math.round((fullySupported / responsesGenerated) * 100)}% of responses`
                : 'No responses yet'}
            </p>
          </CardContent>
        </Card>

        {/* Partially Supported */}
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Partially Supported
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{partiallySupported}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {responsesGenerated > 0 
                ? `${Math.round((partiallySupported / responsesGenerated) * 100)}% of responses`
                : 'No responses yet'}
            </p>
          </CardContent>
        </Card>

        {/* Not Supported */}
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              Not Supported
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{notSupported}</div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {responsesGenerated > 0 
                ? `${Math.round((notSupported / responsesGenerated) * 100)}% of responses`
                : 'No responses yet'}
            </p>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Questions:</span>
                <span className="font-semibold">{totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">With Responses:</span>
                <span className="font-semibold">{responsesGenerated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Pending:</span>
                <span className="font-semibold">{totalQuestions - responsesGenerated}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Fitment Score:</span>
                  <span className={`text-lg font-bold ${getFitmentColor(fitmentPercentage)}`}>
                    {fitmentPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

