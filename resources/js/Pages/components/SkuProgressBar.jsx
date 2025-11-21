// resources/js/Pages/components/SkuProgressBar.jsx
export default function SkuProgressBar({ applying, progress, total }) {
    if (!applying) return null;

    return (
        <div className="p-4 mt-4 text-white rounded-lg bg-black/90">
            <div className="flex justify-between mb-2">
                <span>Applying SKUs...</span>
                <span>{Math.round((progress / total) * 100)}%</span>
            </div>
            <div className="w-full h-3 overflow-hidden rounded-full bg-white/20">
                <div
                    className="h-full transition-all bg-gradient-to-r from-green-400 to-emerald-500"
                    style={{ width: `${(progress / total) * 100}%` }}
                />
            </div>
        </div>
    );
}
